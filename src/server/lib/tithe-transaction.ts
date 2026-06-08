import { eq } from 'drizzle-orm'
import type { drizzle } from 'drizzle-orm/d1'
import * as schema from '../schema'
import { shouldGenerateTitheCommitment, type TitheExemption } from '../../lib/tithe-exemption'
import { computeTitheAmounts } from './tithe-commitment'

type Db = ReturnType<typeof drizzle<typeof schema>>

export async function maybeCreateTitheCommitment(
  db: Db,
  userId: string,
  tx: {
    id: number
    date: string
    amount: number
    currency: string
    trm: number
    amountInBase: number
    categoryId: number
  },
  titheExemption: TitheExemption | null | undefined,
) {
  if (!shouldGenerateTitheCommitment(titheExemption)) {
    await db.update(schema.transactions).set({
      isTitheCalculated: false,
      updatedAt: new Date().toISOString(),
    }).where(eq(schema.transactions.id, tx.id))
    return
  }

  if (tx.amountInBase <= 0) return

  try {
    let settingRow = await db.query.settings.findFirst({
      where: (s, { eq, and }) => and(eq(s.key, 'titheConfig'), eq(s.userId, userId)),
    })

    if (!settingRow?.value) {
      const defaultConfig = {
        defaultTithe: 10,
        defaultOffering: 10,
        destination: 'Iglesia local',
        tithePercentByIncomeCategory: {},
      }
      await db.insert(schema.settings).values({
        key: 'titheConfig',
        userId,
        value: JSON.stringify(defaultConfig),
      })
      settingRow = { key: 'titheConfig', userId, value: defaultConfig }
    }

    const config = typeof settingRow.value === 'string'
      ? JSON.parse(settingRow.value)
      : settingRow.value

    const { tithe, offering, tithePct, offeringPct } = computeTitheAmounts(
      tx.amountInBase,
      tx.categoryId,
      config,
    )

    if (tithe > 0 || offering > 0) {
      await db.insert(schema.titheCommitments).values({
        userId,
        incomeTransactionId: tx.id,
        date: tx.date,
        incomeAmount: tx.amount,
        incomeCurrency: tx.currency as 'COP' | 'USD' | 'EUR',
        incomeTrm: tx.trm,
        incomeAmountBase: tx.amountInBase,
        tithePercent: tithePct,
        offeringPercent: offeringPct,
        titheAmount: tithe,
        offeringAmount: offering,
        totalAmount: tithe + offering,
        status: 'pending',
        createdAt: new Date().toISOString(),
      })

      await db.update(schema.transactions).set({
        isTitheCalculated: true,
        updatedAt: new Date().toISOString(),
      }).where(eq(schema.transactions.id, tx.id))
    }
  } catch {
    // Best-effort — income row is already persisted.
  }
}

export async function removePendingTitheCommitment(
  db: Db,
  userId: string,
  incomeTransactionId: number,
) {
  const commitment = await db.query.titheCommitments.findFirst({
    where: (tc, { eq, and }) => and(
      eq(tc.incomeTransactionId, incomeTransactionId),
      eq(tc.userId, userId),
    ),
  })
  if (!commitment) return

  const linkedPayments = await db.query.commitmentPayments.findMany({
    where: (cp, { eq }) => eq(cp.commitmentId, commitment.id),
  })
  if (linkedPayments.length > 0) return

  await db.delete(schema.titheCommitments).where(eq(schema.titheCommitments.id, commitment.id))
  await db.update(schema.transactions).set({
    isTitheCalculated: false,
    updatedAt: new Date().toISOString(),
  }).where(eq(schema.transactions.id, incomeTransactionId))
}

export async function syncTitheCommitmentForIncome(
  db: Db,
  userId: string,
  tx: {
    id: number
    type: string
    date: string
    amount: number
    currency: string
    trm: number
    amountInBase: number
    categoryId: number
  },
  titheExemption: TitheExemption | null | undefined,
) {
  if (tx.type !== 'income') return

  if (!shouldGenerateTitheCommitment(titheExemption)) {
    await removePendingTitheCommitment(db, userId, tx.id)
    return
  }

  const commitment = await db.query.titheCommitments.findFirst({
    where: (tc, { eq, and }) => and(
      eq(tc.incomeTransactionId, tx.id),
      eq(tc.userId, userId),
    ),
  })

  if (commitment?.status === 'paid') return

  if (commitment) {
    const settingRow = await db.query.settings.findFirst({
      where: (s, { eq, and }) => and(eq(s.key, 'titheConfig'), eq(s.userId, userId)),
    })
    const config = settingRow?.value
      ? (typeof settingRow.value === 'string' ? JSON.parse(settingRow.value) : settingRow.value)
      : null
    if (!config) return

    const { tithePct, offeringPct, tithe, offering } = computeTitheAmounts(
      tx.amountInBase,
      tx.categoryId,
      config,
    )
    await db.update(schema.titheCommitments).set({
      tithePercent: tithePct,
      offeringPercent: offeringPct,
      titheAmount: tithe,
      offeringAmount: offering,
      totalAmount: tithe + offering,
      incomeAmount: tx.amount,
      incomeCurrency: tx.currency as 'COP' | 'USD' | 'EUR',
      incomeTrm: tx.trm,
      incomeAmountBase: tx.amountInBase,
    }).where(eq(schema.titheCommitments.id, commitment.id))
    return
  }

  await maybeCreateTitheCommitment(db, userId, tx, titheExemption)
}
