import { Hono } from 'hono'
import { getAuth } from '@hono/clerk-auth'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and, sql } from 'drizzle-orm'
import * as schema from '../schema'
import type { AppEnv } from '../types'

export const titheCommitmentsRouter = new Hono<AppEnv>()

// GET /api/tithe-commitments
titheCommitmentsRouter.get('/', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const statusParam = c.req.query('status') as 'pending' | 'paid' | 'partial' | null
  const db = drizzle(c.env.DB, { schema })

  const results = await db.query.titheCommitments.findMany({
    where: statusParam
      ? (tc, { eq, and }) => and(eq(tc.userId, auth.userId), eq(tc.status, statusParam))
      : (tc, { eq }) => eq(tc.userId, auth.userId),
    orderBy: (tc, { desc }) => [desc(tc.date)],
  })

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

  // Get amountPaidUsd for each commitment
  const commitmentIds = results.map(r => r.id).filter(Boolean) as number[]
  const paidMap = new Map<number, number>()
  if (commitmentIds.length > 0) {
    const paidRows = await db
      .select({
        commitmentId: schema.commitmentPayments.commitmentId,
        totalPaid: sql<number>`COALESCE(SUM(${schema.commitmentPayments.amountUsd}), 0)`,
      })
      .from(schema.commitmentPayments)
      .where(sql`${schema.commitmentPayments.commitmentId} IN (${sql.join(commitmentIds.map(id => sql`${id}`), sql`, `)})`)
      .groupBy(schema.commitmentPayments.commitmentId)

    for (const row of paidRows) {
      paidMap.set(row.commitmentId, row.totalPaid)
    }
  }

  // Recalculate dynamic status
  const enriched = results.map(r => {
    const amountPaidUsd = paidMap.get(r.id!) ?? 0
    const dynamicStatus = amountPaidUsd >= r.totalAmount ? 'paid' : amountPaidUsd > 0 ? 'partial' : 'pending'

    // Update DB status if stale
    if (r.status !== dynamicStatus) {
      db.update(schema.titheCommitments).set({ status: dynamicStatus })
        .where(eq(schema.titheCommitments.id, r.id!)).then(() => {})
    }

    return {
      ...r,
      status: dynamicStatus,
      incomeConcept: txMap[r.incomeTransactionId]?.concept ?? '',
      incomeCategory: txMap[r.incomeTransactionId]?.categoryId ?? 0,
      incomeCurrency: txMap[r.incomeTransactionId]?.currency ?? r.incomeCurrency,
      incomeOriginalAmount: txMap[r.incomeTransactionId]?.amount ?? r.incomeAmount,
      amountPaidUsd,
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
      totalPending: sql<number>`COALESCE(SUM(CASE WHEN ${schema.titheCommitments.status} != 'paid' THEN ${schema.titheCommitments.totalAmount} ELSE 0 END), 0)`,
      totalPaid: sql<number>`COALESCE(SUM(CASE WHEN ${schema.titheCommitments.status} = 'paid' THEN ${schema.titheCommitments.totalAmount} ELSE 0 END), 0)`,
      pendingCount: sql<number>`COALESCE(SUM(CASE WHEN ${schema.titheCommitments.status} != 'paid' THEN 1 ELSE 0 END), 0)`,
    })
    .from(schema.titheCommitments)
    .where(eq(schema.titheCommitments.userId, auth.userId))

  return c.json(result[0] ?? { totalPending: 0, totalPaid: 0, pendingCount: 0 })
})

// PUT /api/tithe-commitments/:id
titheCommitmentsRouter.put('/:id', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const id = parseInt(c.req.param('id'), 10)
  const body = await c.req.json()
  const db = drizzle(c.env.DB, { schema })

  const result = await db
    .update(schema.titheCommitments)
    .set(body)
    .where(and(eq(schema.titheCommitments.id, id), eq(schema.titheCommitments.userId, auth.userId)))
    .returning()

  return c.json(result[0])
})

// DELETE /api/tithe-commitments/:id
titheCommitmentsRouter.delete('/:id', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const id = parseInt(c.req.param('id'), 10)
  const db = drizzle(c.env.DB, { schema })

  // Delete linked commitment_payments first
  await db.delete(schema.commitmentPayments)
    .where(eq(schema.commitmentPayments.commitmentId, id))

  await db
    .delete(schema.titheCommitments)
    .where(and(eq(schema.titheCommitments.id, id), eq(schema.titheCommitments.userId, auth.userId)))

  return c.json({ success: true })
})
