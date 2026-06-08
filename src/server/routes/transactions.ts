import { Hono } from 'hono'
import { getAuth } from '@hono/clerk-auth'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and } from 'drizzle-orm'
import * as schema from '../schema'
import type { AppEnv } from '../types'
import { parseTitheExemption } from '../../lib/tithe-exemption'
import { maybeCreateTitheCommitment, syncTitheCommitmentForIncome } from '../lib/tithe-transaction'

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
    return c.json({ error: 'Invalid FX rate for COP. Must be greater than 1.' }, 400)
  }

  const titheExemption = parseTitheExemption(body.titheExemption)
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
    accountId: body.accountId ?? null,
    titheExemption: titheExemption ?? null,
    isTitheCalculated: false,
    userId: auth.userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }).returning()

  const tx = result[0]

  if (body.type === 'income' && tx?.id && body.amountInBase > 0) {
    await maybeCreateTitheCommitment(db, auth.userId, {
      id: tx.id,
      date: body.date,
      amount: body.amount,
      currency: body.currency,
      trm: body.trm,
      amountInBase: body.amountInBase,
      categoryId: body.categoryId,
    }, titheExemption)
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

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() }
  const allowedFields = [
    'date', 'type', 'concept', 'categoryId', 'amount', 'currency', 'trm',
    'amountInBase', 'amountInSecondary', 'notes', 'attachments', 'invoiceId',
    'debtId', 'isRecurring', 'capitalAmount', 'interestAmount', 'accountId',
    'titheExemption',
  ]
  for (const key of allowedFields) {
    if (body[key] !== undefined) updates[key] = body[key]
  }
  if (body.titheExemption !== undefined) {
    updates.titheExemption = parseTitheExemption(body.titheExemption)
  }

  const result = await db.update(schema.transactions).set(updates).where(
    and(eq(schema.transactions.id, id), eq(schema.transactions.userId, auth.userId)),
  ).returning()

  const updated = result[0]

  if (updated && updated.type === 'income') {
    const exemption = parseTitheExemption(updated.titheExemption)
    const fieldsChanged = body.categoryId != null || body.amount != null
      || body.amountInBase != null || body.titheExemption !== undefined

    if (fieldsChanged) {
      await syncTitheCommitmentForIncome(db, auth.userId, {
        id: updated.id,
        type: updated.type,
        date: updated.date,
        amount: updated.amount,
        currency: updated.currency,
        trm: updated.trm,
        amountInBase: updated.amountInBase,
        categoryId: updated.categoryId,
      }, exemption)
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
  const { transactions, invoices, invoiceItems, titheCommitments } = schema

  const tx = await db.query.transactions.findFirst({
    where: (t, { eq, and }) => and(eq(t.id, id), eq(t.userId, auth.userId)),
  })
  if (!tx) return c.json({ error: 'Not found' }, 404)

  const commitment = await db.query.titheCommitments.findFirst({
    where: (tc, { eq }) => eq(tc.incomeTransactionId, id),
  })

  if (commitment) {
    const linkedPayments = await db.query.commitmentPayments.findMany({
      where: (cp, { eq }) => eq(cp.commitmentId, commitment.id),
    })

    if (linkedPayments.length > 0) {
      return c.json({ error: 'This transaction has a tithe commitment with recorded payments. Delete it from the Tithe section.' }, 400)
    }

    await db.delete(titheCommitments).where(eq(titheCommitments.id, commitment.id))
  }

  const payment = await db.query.tithePayments.findFirst({
    where: (tp, { eq }) => eq(tp.transactionId, id),
  })

  if (payment) {
    return c.json({ error: 'This transaction is a recorded tithe/offering payment. Delete it from the Tithe section.' }, 400)
  }

  const invoiceId = tx.invoiceId
  const deleteTx = db.delete(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, auth.userId)))

  if (invoiceId) {
    const deleteItems = db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId))
    const deleteInv = db.delete(invoices).where(and(eq(invoices.id, invoiceId), eq(invoices.userId, auth.userId)))
    await db.batch([deleteTx, deleteItems, deleteInv] as any)
  } else {
    await deleteTx
  }

  return c.json({
    deleted: {
      transaction: 1,
      invoice: invoiceId ? 1 : 0,
      items: invoiceId ? 'cascade' : 0,
    },
  })
})
