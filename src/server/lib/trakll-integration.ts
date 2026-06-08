import { z } from 'zod'
import type { drizzle } from 'drizzle-orm/d1'
import * as schema from '../schema'
import { getEquivalentAmounts } from '../../lib/currency'
import type { Currency } from '../../types/domain'
import { maybeCreateTitheCommitment } from './tithe-transaction'

export const TRAKLL_EXTERNAL_REF_PREFIX = 'trakll:invoice:'

export const trakllIncomeBodySchema = z.object({
  externalId: z.string().min(1),
  amount: z.number().positive(),
  currency: z.enum(['USD', 'COP', 'EUR']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  concept: z.string().min(1),
  clientName: z.string().optional(),
  invoiceNumber: z.string().optional(),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export type TrakllIncomeBody = z.infer<typeof trakllIncomeBodySchema>

export function trakllExternalRef(externalId: string): string {
  return `${TRAKLL_EXTERNAL_REF_PREFIX}${externalId}`
}

/** trakll stores money as integer cents; patrimonio uses decimal floats. */
export function centsToPatrimonioAmount(cents: number): number {
  return cents / 100
}

type Db = ReturnType<typeof drizzle<typeof schema>>

const FALLBACK_TRM = 4200
const FALLBACK_EUR_USD = 1.08

export async function fetchExchangeRates(): Promise<{ trm: number; eurToUsd: number }> {
  let trm = FALLBACK_TRM
  let eurToUsd = FALLBACK_EUR_USD

  try {
    const res = await fetch('https://www.datos.gov.co/resource/32sa-8pi3.json')
    if (res.ok) {
      const data = await res.json() as Array<{ valor?: string }>
      const parsed = parseFloat(data?.[0]?.valor ?? '')
      if (Number.isFinite(parsed) && parsed > 1) trm = parsed
    }
  } catch {
    // keep fallback
  }

  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=EUR&to=USD')
    if (res.ok) {
      const data = await res.json() as { rates?: { USD?: number } }
      const parsed = data?.rates?.USD
      if (typeof parsed === 'number' && Number.isFinite(parsed)) eurToUsd = parsed
    }
  } catch {
    // keep fallback
  }

  return { trm, eurToUsd }
}

/**
 * Category for trakll-synced income:
 * 1. settings key `trakllIncomeCategoryId` (number)
 * 2. first income category for the user (lowest id)
 */
export async function resolveTrakllIncomeCategoryId(
  db: Db,
  userId: string,
): Promise<number | null> {
  const categorySetting = await db.query.settings.findFirst({
    where: (s, { eq, and }) => and(eq(s.userId, userId), eq(s.key, 'trakllIncomeCategoryId')),
  })

  const raw = categorySetting?.value
  const configuredId =
  typeof raw === 'number' ? raw
  : typeof raw === 'string' ? parseInt(raw, 10)
  : typeof raw === 'object' && raw != null && 'id' in raw ? Number((raw as { id: unknown }).id)
  : NaN

  if (Number.isFinite(configuredId) && configuredId > 0) {
    const cat = await db.query.categories.findFirst({
      where: (c, { eq, and }) => and(
        eq(c.userId, userId),
        eq(c.id, configuredId),
        eq(c.type, 'income'),
      ),
    })
    if (cat?.id) return cat.id
  }

  const firstIncome = await db.query.categories.findFirst({
    where: (c, { eq, and }) => and(eq(c.userId, userId), eq(c.type, 'income')),
    orderBy: (c, { asc }) => [asc(c.id)],
  })

  return firstIncome?.id ?? null
}

export async function findExistingTrakllIncome(
  db: Db,
  userId: string,
  externalId: string,
) {
  const notes = trakllExternalRef(externalId)
  return db.query.transactions.findFirst({
    where: (t, { eq, and }) => and(
      eq(t.userId, userId),
      eq(t.notes, notes),
      eq(t.type, 'income'),
    ),
  })
}

export async function createTrakllIncomeTransaction(
  db: Db,
  userId: string,
  body: TrakllIncomeBody,
) {
  const categoryId = await resolveTrakllIncomeCategoryId(db, userId)
  if (!categoryId) {
    throw new Error('NO_INCOME_CATEGORY')
  }

  const rates = await fetchExchangeRates()
  const currency = body.currency as Currency
  const { amountInBase, amountInSecondary } = getEquivalentAmounts(body.amount, currency, rates)
  const trm = rates.trm
  const now = new Date().toISOString()
  const notes = trakllExternalRef(body.externalId)

  const result = await db.insert(schema.transactions).values({
    userId,
    date: body.date,
    type: 'income',
    concept: body.concept,
    categoryId,
    amount: body.amount,
    currency,
    trm,
    amountInBase,
    amountInSecondary,
    notes,
    isTitheCalculated: false,
    createdAt: now,
    updatedAt: now,
  }).returning()

  const tx = result[0]
  if (!tx?.id || amountInBase <= 0) return tx

  // Freelance income from trakll: auto-tithe unless user later marks exemption on the tx.
  await maybeCreateTitheCommitment(db, userId, {
    id: tx.id,
    date: body.date,
    amount: body.amount,
    currency,
    trm,
    amountInBase,
    categoryId,
  }, null)

  return tx
}
