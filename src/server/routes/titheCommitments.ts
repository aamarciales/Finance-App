import { Hono } from 'hono'
import { getAuth } from '@hono/clerk-auth'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and, sql, inArray } from 'drizzle-orm'
import * as schema from '../schema'
import type { AppEnv } from '../types'

export const titheCommitmentsRouter = new Hono<AppEnv>()

// GET /api/tithe-commitments
titheCommitmentsRouter.get('/', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const statusParam = c.req.query('status') as 'pending' | 'partial' | 'paid' | null
  const db = drizzle(c.env.DB, { schema })

  const results = await db.query.titheCommitments.findMany({
    where: statusParam
      ? (tc, { eq, and }) => and(eq(tc.userId, auth.userId), eq(tc.status, statusParam))
      : (tc, { eq }) => eq(tc.userId, auth.userId),
    orderBy: (tc, { desc }) => [desc(tc.date)],
  })

  // Get payment sums per commitment
  const commitmentIds = results.map(r => r.id).filter(Boolean)
  let paidMap: Record<number, number> = {}
  if (commitmentIds.length > 0) {
    const paidRows = await db
      .select({
        commitmentId: schema.commitmentPayments.commitmentId,
        totalPaid: sql<number>`COALESCE(SUM(${schema.commitmentPayments.amountUsd}), 0)`,
      })
      .from(schema.commitmentPayments)
      .where(inArray(schema.commitmentPayments.commitmentId, commitmentIds))
      .groupBy(schema.commitmentPayments.commitmentId)
    for (const row of paidRows) {
      paidMap[row.commitmentId] = row.totalPaid
    }
  }

  // Enrich with income transaction details
  const txIds = results.map(r => r.incomeTransactionId).filter(Boolean)
  let txMap: Record<number, { concept: string; categoryId: number; currency: string; amount: number }> = {}
  if (txIds.length > 0) {
    const txs = await db.query.transactions.findMany({
      where: (t, { inArray }) => inArray(t.id, txIds),
      columns: { id: true, concept: true, categoryId: true, currency: true, amount: true },
    })
    for (const tx of txs) {
      txMap[tx.id] = { concept: tx.concept, categoryId: tx.categoryId, currency: tx.currency, amount: tx.amount }
    }
  }

  const enriched = results.map(r => {
    const amountPaidUsd = paidMap[r.id] ?? 0
    // Calculate dynamic status
    let dynamicStatus = r.status
    if (amountPaidUsd >= r.totalAmount && amountPaidUsd > 0) {
      dynamicStatus = 'paid'
    } else if (amountPaidUsd > 0 && amountPaidUsd < r.totalAmount) {
      dynamicStatus = 'partial'
    }

    return {
      ...r,
      status: dynamicStatus,
      amountPaidUsd,
      incomeConcept: txMap[r.incomeTransactionId]?.concept ?? '',
      incomeCategory: txMap[r.incomeTransactionId]?.categoryId ?? 0,
      incomeCurrency: txMap[r.incomeTransactionId]?.currency ?? r.incomeCurrency,
      incomeOriginalAmount: txMap[r.incomeTransactionId]?.amount ?? r.incomeAmount,
    }
  })

  return c.json(enriched)
})

// GET /api/tithe-commitments/pending-summary
titheCommitmentsRouter.get('/pending-summary', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const db = drizzle(c.env.DB, { schema })

  const result = await db
    .select({
      totalPending: sql<number>`COALESCE(SUM(CASE WHEN ${schema.titheCommitments.status} IN ('pending', 'partial') THEN ${schema.titheCommitments.totalAmount} ELSE 0 END), 0)`,
      totalPaid: sql<number>`COALESCE(SUM(CASE WHEN ${schema.titheCommitments.status} = 'paid' THEN ${schema.titheCommitments.totalAmount} ELSE 0 END), 0)`,
      pendingCount: sql<number>`COALESCE(SUM(CASE WHEN ${schema.titheCommitments.status} IN ('pending', 'partial') THEN 1 ELSE 0 END), 0)`,
      totalDebt: sql<number>`COALESCE(SUM(CASE WHEN ${schema.titheCommitments.status} = 'debt' THEN ${schema.titheCommitments.totalAmount} ELSE 0 END), 0)`,
      debtCount: sql<number>`COALESCE(SUM(CASE WHEN ${schema.titheCommitments.status} = 'debt' THEN 1 ELSE 0 END), 0)`,
    })
    .from(schema.titheCommitments)
    .where(eq(schema.titheCommitments.userId, auth.userId))

  return c.json(result[0] ?? { totalPending: 0, totalPaid: 0, pendingCount: 0, totalDebt: 0, debtCount: 0 })
})

// PUT /api/tithe-commitments/:id
titheCommitmentsRouter.put('/:id', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const id = parseInt(c.req.param('id'), 10)
  const body = await c.req.json()
  const db = drizzle(c.env.DB, { schema })

  const updates: Record<string, any> = {}
  const allowedFields = ['status']
  for (const key of allowedFields) {
    if (body[key] !== undefined) updates[key] = body[key]
  }

  const result = await db
    .update(schema.titheCommitments)
    .set(updates)
    .where(and(eq(schema.titheCommitments.id, id), eq(schema.titheCommitments.userId, auth.userId)))
    .returning()

  return c.json(result[0])
})

// POST /api/tithe-commitments/mark-as-debt
titheCommitmentsRouter.post('/mark-as-debt', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const { commitmentIds } = await c.req.json()
  if (!commitmentIds?.length) {
    return c.json({ error: 'Selecciona al menos un compromiso' }, 400)
  }

  const db = drizzle(c.env.DB, { schema })

  const commitments = await db.query.titheCommitments.findMany({
    where: (tc, { eq, and, inArray }) => and(
      eq(tc.userId, auth.userId),
      inArray(tc.id, commitmentIds),
      eq(tc.status, 'pending'),
    ),
  })

  if (commitments.length === 0) {
    return c.json({ error: 'No hay compromisos pendientes para mover' }, 400)
  }

  for (const c of commitments) {
    await db.update(schema.titheCommitments).set({ status: 'debt' })
      .where(eq(schema.titheCommitments.id, c.id))
  }

  const totalMoved = commitments.reduce((s, c) => s + c.totalAmount, 0)
  return c.json({ movedCount: commitments.length, totalMoved })
})

// DELETE /api/tithe-commitments/:id
titheCommitmentsRouter.delete('/:id', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const id = parseInt(c.req.param('id'), 10)
  const db = drizzle(c.env.DB, { schema })

  await db.delete(schema.commitmentPayments)
    .where(eq(schema.commitmentPayments.commitmentId, id))

  await db
    .delete(schema.titheCommitments)
    .where(and(eq(schema.titheCommitments.id, id), eq(schema.titheCommitments.userId, auth.userId)))

  return c.json({ success: true })
})
