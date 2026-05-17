import { Hono } from 'hono'
import { getAuth } from '@hono/clerk-auth'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and } from 'drizzle-orm'
import * as schema from '../schema'
import type { AppEnv } from '../types'

function computeTithe(amountBase: number, categoryId: number, titheConfig: any) {
  const defaultTithe = titheConfig?.defaultTithe ?? 10
  const defaultOffering = titheConfig?.defaultOffering ?? 10
  const catConfig = titheConfig?.tithePercentByIncomeCategory?.[categoryId]
  const tithePct = catConfig?.tithe ?? defaultTithe
  const offeringPct = catConfig?.offering ?? defaultOffering
  return {
    tithe: Math.round(amountBase * (tithePct / 100) * 100) / 100,
    offering: Math.round(amountBase * (offeringPct / 100) * 100) / 100,
    tithePct,
    offeringPct,
  }
}

export const transactionsRouter = new Hono<AppEnv>()

// GET /api/transactions
transactionsRouter.get('/', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const db = drizzle(c.env.DB, { schema })
  const results = await db.query.transactions.findMany({
    where: (t, { eq }) => eq(t.userId, auth.userId),
    orderBy: (t, { desc }) => [desc(t.date), desc(t.createdAt)],
  })

  return c.json(results)
})

// POST /api/transactions
transactionsRouter.post('/', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const body = await c.req.json()

  if (body.currency === 'COP' && (!body.trm || body.trm <= 1)) {
    return c.json({ error: 'TRM inválida para moneda COP. Debe ser mayor a 1.' }, 400)
  }

  const db = drizzle(c.env.DB, { schema })

  const result = await db.insert(schema.transactions).values({
    date: body.date,
    type: body.type,
    concept: body.concept,
    categoryId: body.categoryId,
    amount: body.amount,
    currency: body.currency,
    trm: body.trm,
    amountInBase: body.amountInBase,
    amountInSecondary: body.amountInSecondary,
    notes: body.notes ?? null,
    attachments: body.attachments ?? null,
    invoiceId: body.invoiceId ?? null,
    debtId: body.debtId ?? null,
    isRecurring: body.isRecurring ?? false,
    capitalAmount: body.capitalAmount ?? null,
    interestAmount: body.interestAmount ?? null,
    isTitheCalculated: false,
    userId: auth.userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as any).returning()

  const tx = result[0]

  // Auto-generate tithe commitment for income transactions
  if (body.type === 'income' && tx?.id && body.amountInBase > 0) {
    try {
      let settingRow = await db.query.settings.findFirst({
        where: (s, { eq, and }) => and(eq(s.key, 'titheConfig'), eq(s.userId, auth.userId)),
      })

      // Auto-create titheConfig with defaults if it doesn't exist
      if (!settingRow?.value) {
        const defaultConfig = {
          defaultTithe: 10,
          defaultOffering: 10,
          destination: 'Iglesia local',
          tithePercentByIncomeCategory: {},
        }
        await db.insert(schema.settings).values({
          key: 'titheConfig',
          userId: auth.userId,
          value: JSON.stringify(defaultConfig),
        })
        settingRow = { key: 'titheConfig', userId: auth.userId, value: defaultConfig }
      }

      const config = typeof settingRow.value === 'string' ? JSON.parse(settingRow.value) : settingRow.value
      const { tithe, offering, tithePct, offeringPct } = computeTithe(body.amountInBase, body.categoryId, config)

      if (tithe > 0 || offering > 0) {
        await db.insert(schema.titheCommitments).values({
          userId: auth.userId,
          incomeTransactionId: tx.id,
          date: body.date,
          incomeAmount: body.amount,
          incomeCurrency: body.currency,
          incomeTrm: body.trm,
          incomeAmountBase: body.amountInBase,
          tithePercent: tithePct,
          offeringPercent: offeringPct,
          titheAmount: tithe,
          offeringAmount: offering,
          totalAmount: tithe + offering,
          status: 'pending',
          createdAt: new Date().toISOString(),
        })

        await db.update(schema.transactions).set({
          isTitheCalculated: true as any,
          updatedAt: new Date().toISOString(),
        }).where(eq(schema.transactions.id, tx.id))
      }
    } catch {
      // Don't fail the transaction if commitment generation fails
    }
  }

  return c.json(tx)
})

// PUT /api/transactions/:id
transactionsRouter.put('/:id', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const id = parseInt(c.req.param('id'), 10)
  const body = await c.req.json()
  const db = drizzle(c.env.DB, { schema })

  const updates: Record<string, any> = { updatedAt: new Date().toISOString() }
  const allowedFields = ['date', 'type', 'concept', 'categoryId', 'amount', 'currency', 'trm', 'amountInBase', 'amountInSecondary', 'notes', 'attachments', 'invoiceId', 'debtId', 'isRecurring', 'capitalAmount', 'interestAmount']
  for (const key of allowedFields) {
    if (body[key] !== undefined) updates[key] = body[key]
  }

  const result = await db.update(schema.transactions).set(updates).where(
    and(eq(schema.transactions.id, id), eq(schema.transactions.userId, auth.userId))
  ).returning()

  const updated = result[0]

  // Recalculate tithe commitment if category or amount changed on an income transaction
  if (updated && updated.type === 'income' && (body.categoryId != null || body.amount != null || body.amountInBase != null)) {
    const commitment = await db.query.titheCommitments.findFirst({
      where: (tc, { eq, and }) => and(eq(tc.incomeTransactionId, id), eq(tc.userId, auth.userId)),
    })

    if (commitment && commitment.status !== 'paid') {
      const settingRow = await db.query.settings.findFirst({
        where: (s, { eq, and }) => and(eq(s.key, 'titheConfig'), eq(s.userId, auth.userId)),
      })
      const config = settingRow?.value ? (typeof settingRow.value === 'string' ? JSON.parse(settingRow.value) : settingRow.value) : null

      if (config) {
        const { tithePct, offeringPct } = computeTithe(updated.amountInBase, updated.categoryId, config)
        const titheAmount = Math.round(updated.amountInBase * (tithePct / 100) * 100) / 100
        const offeringAmount = Math.round(updated.amountInBase * (offeringPct / 100) * 100) / 100
        await db.update(schema.titheCommitments).set({
          tithePercent: tithePct,
          offeringPercent: offeringPct,
          titheAmount,
          offeringAmount,
          totalAmount: titheAmount + offeringAmount,
          incomeAmount: updated.amount,
          incomeCurrency: updated.currency,
          incomeTrm: updated.trm,
          incomeAmountBase: updated.amountInBase,
        }).where(eq(schema.titheCommitments.id, commitment.id))
      }
    }
  }

  return c.json(updated)
})

// DELETE /api/transactions/:id
transactionsRouter.delete('/:id', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const id = parseInt(c.req.param('id'), 10)
  const db = drizzle(c.env.DB, { schema })

  // Check for linked tithe commitment
  const commitment = await db.query.titheCommitments.findFirst({
    where: (tc, { eq }) => eq(tc.incomeTransactionId, id),
  })

  if (commitment) {
    // Delete any linked commitment_payments first
    await db.delete(schema.commitmentPayments).where(
      eq(schema.commitmentPayments.commitmentId, commitment.id)
    )
    // Delete the commitment itself (regardless of status)
    await db.delete(schema.titheCommitments).where(eq(schema.titheCommitments.id, commitment.id))
  }

  await db.delete(schema.transactions).where(
    and(eq(schema.transactions.id, id), eq(schema.transactions.userId, auth.userId))
  )

  return c.json({ success: true })
})
