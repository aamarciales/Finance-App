import { Hono } from 'hono'
import { getAuth } from '@hono/clerk-auth'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and } from 'drizzle-orm'
import * as schema from '../schema'
import type { AppEnv } from '../types'

function computeTithe(amountBase: number, categoryId: number, titheConfig: any) {
  const defaultTithe = titheConfig?.defaultTithe ?? 10
  const defaultOffering = titheConfig?.defaultOffering ?? 0
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
    ...body,
    userId: auth.userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }).returning()

  const tx = result[0]

  // Auto-generate tithe commitment for income transactions
  if (body.type === 'income' && tx?.id && body.amountInBase > 0) {
    try {
      const settingRow = await db.query.settings.findFirst({
        where: (s, { eq, and }) => and(eq(s.key, 'titheConfig'), eq(s.userId, auth.userId)),
      })

      if (settingRow?.value) {
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

  const result = await db.update(schema.transactions).set({
    ...body,
    updatedAt: new Date().toISOString(),
  }).where(
    and(eq(schema.transactions.id, id), eq(schema.transactions.userId, auth.userId))
  ).returning()

  return c.json(result[0])
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
    if (commitment.status === 'paid') {
      return c.json({ error: 'Esta transacción tiene un compromiso de diezmo ya pagado. Revierte el pago primero.' }, 400)
    }
    // Delete pending commitment
    await db.delete(schema.titheCommitments).where(eq(schema.titheCommitments.id, commitment.id))
  }

  await db.delete(schema.transactions).where(
    and(eq(schema.transactions.id, id), eq(schema.transactions.userId, auth.userId))
  )

  return c.json({ success: true })
})
