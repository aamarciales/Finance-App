import { Hono } from 'hono'
import { getAuth } from '@hono/clerk-auth'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and } from 'drizzle-orm'
import * as schema from '../schema'
import type { AppEnv } from '../types'

export const invoicesRouter = new Hono<AppEnv>()

invoicesRouter.get('/', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const db = drizzle(c.env.DB, { schema })
  const results = await db.query.invoices.findMany({
    where: (i, { eq }) => eq(i.userId, auth.userId),
  })

  return c.json(results)
})

invoicesRouter.post('/', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const body = await c.req.json()

  if (body.currency === 'COP' && (!body.trm || body.trm <= 1)) {
    return c.json({ error: 'Invalid FX rate for COP. Must be greater than 1.' }, 400)
  }

  const db = drizzle(c.env.DB, { schema })

  const values: Record<string, any> = {
    userId: auth.userId,
    createdAt: new Date().toISOString(),
  }
  const allowedFields = ['transactionId', 'date', 'merchant', 'branch', 'subtotal', 'discount', 'total', 'currency', 'trm', 'itemCount', 'ocrConfidence', 'attachmentUrl']
  for (const key of allowedFields) {
    if (body[key] !== undefined) values[key] = body[key]
  }

  try {
    const result = await db.insert(schema.invoices).values(values as any).returning()
    return c.json(result[0])
  } catch (err) {
    console.error('Invoice insert error:', err)
    return c.json({ error: 'Could not create invoice: ' + (err instanceof Error ? err.message : String(err)) }, 500)
  }
})

invoicesRouter.put('/:id', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const id = parseInt(c.req.param('id'), 10)
  const body = await c.req.json()
  const db = drizzle(c.env.DB, { schema })

  const updates: Record<string, any> = {}
  const allowedFields = ['transactionId', 'date', 'merchant', 'branch', 'subtotal', 'discount', 'total', 'currency', 'trm', 'itemCount', 'ocrConfidence', 'attachmentUrl']
  for (const key of allowedFields) {
    if (body[key] !== undefined) updates[key] = body[key]
  }

  try {
    const result = await db.update(schema.invoices).set(updates).where(
      and(eq(schema.invoices.id, id), eq(schema.invoices.userId, auth.userId))
    ).returning()

    return c.json(result[0])
  } catch (err) {
    console.error('Invoice update error:', err)
    return c.json({ error: 'Could not update invoice: ' + (err instanceof Error ? err.message : String(err)) }, 500)
  }
})

invoicesRouter.delete('/:id', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const id = parseInt(c.req.param('id'), 10)
  const db = drizzle(c.env.DB, { schema })
  const { invoices, invoiceItems, transactions } = schema

  // 1. Find invoice (verify ownership)
  const inv = await db.query.invoices.findFirst({
    where: (i, { eq, and }) => and(eq(i.id, id), eq(i.userId, auth.userId)),
  })
  if (!inv) return c.json({ error: 'Not found' }, 404)

  // 2. Find associated transaction
  const linkedTx = inv.transactionId
    ? await db.query.transactions.findFirst({
        where: (t, { eq, and }) => and(eq(t.id, inv.transactionId!), eq(t.userId, auth.userId)),
      })
    : null

  // 3. Check if linked tx has commitment_payments
  let canCascadeTransaction = true
  if (linkedTx) {
    const linkedCommitment = await db.query.titheCommitments.findFirst({
      where: (tc, { eq }) => eq(tc.incomeTransactionId, linkedTx.id),
    })
    if (linkedCommitment) {
      const linkedPayments = await db.query.commitmentPayments.findMany({
        where: (cp, { eq }) => eq(cp.commitmentId, linkedCommitment.id),
      })
      if (linkedPayments.length > 0) canCascadeTransaction = false
    }
    // Also check tithe_payments
    const tithePayment = await db.query.tithePayments.findFirst({
      where: (tp, { eq }) => eq(tp.transactionId, linkedTx.id),
    })
    if (tithePayment) canCascadeTransaction = false
  }

  // 4. Build and execute batch
  const deleteItems = db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id))
  const deleteInvoice = db.delete(invoices).where(and(eq(invoices.id, id), eq(invoices.userId, auth.userId)))

  if (linkedTx && canCascadeTransaction) {
    const deleteTx = db.delete(transactions).where(and(eq(transactions.id, linkedTx.id), eq(transactions.userId, auth.userId)))
    await db.batch([deleteItems, deleteInvoice, deleteTx] as any)
  } else {
    await db.batch([deleteItems, deleteInvoice] as any)
  }

  return c.json({
    deleted: {
      invoice: 1,
      transaction: linkedTx && canCascadeTransaction ? 1 : 0,
      items: 'cascade',
    },
    transactionOrphanedDueToTithe: linkedTx ? !canCascadeTransaction : false,
  })
})
