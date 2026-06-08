import { Hono } from 'hono'
import { getAuth } from '@hono/clerk-auth'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and, sql, inArray } from 'drizzle-orm'
import * as schema from '../schema'
import type { AppEnv } from '../types'
import {
  commitmentPaymentShortfall,
  resolveCommitmentStatus,
} from '../lib/tithe-commitment'

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
    const dynamicStatus = resolveCommitmentStatus(
      amountPaidUsd,
      r.totalAmount,
      r.status as 'pending' | 'partial' | 'paid' | 'debt',
    )

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

// POST /api/tithe-commitments/mark-as-paid — user confirms full payment (TRM drift)
titheCommitmentsRouter.post('/mark-as-paid', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const { commitmentIds } = await c.req.json()
  if (!commitmentIds?.length) {
    return c.json({ error: 'Select at least one commitment' }, 400)
  }

  const db = drizzle(c.env.DB, { schema })

  const commitments = await db.query.titheCommitments.findMany({
    where: (tc, { eq, and, inArray }) => and(
      eq(tc.userId, auth.userId),
      inArray(tc.id, commitmentIds),
    ),
  })

  if (commitments.length !== commitmentIds.length) {
    return c.json({ error: 'Some commitments do not exist or do not belong to you' }, 400)
  }

  const invalid = commitments.filter(tc => tc.status === 'paid')
  if (invalid.length > 0) {
    return c.json({ error: 'Some commitments are already paid' }, 400)
  }

  let markedCount = 0

  for (const commitment of commitments) {
    const paymentLinks = await db.query.commitmentPayments.findMany({
      where: (cp, { eq }) => eq(cp.commitmentId, commitment.id),
    })

    const totalPaid = paymentLinks.reduce((s, p) => s + p.amountUsd, 0)
    if (totalPaid <= 0) {
      return c.json({
        error: `Commitment #${commitment.id} has no recorded payments. Use "Record payment".`,
      }, 400)
    }

    const shortfall = commitmentPaymentShortfall(totalPaid, commitment.totalAmount)
    if (shortfall > 0) {
      const latestLink = paymentLinks.reduce((a, b) =>
        a.createdAt >= b.createdAt ? a : b,
      )
      await db.update(schema.commitmentPayments)
        .set({ amountUsd: Math.round((latestLink.amountUsd + shortfall) * 100) / 100 })
        .where(eq(schema.commitmentPayments.id, latestLink.id))
    }

    await db.update(schema.titheCommitments)
      .set({ status: 'paid' })
      .where(eq(schema.titheCommitments.id, commitment.id))

    markedCount++
  }

  return c.json({ markedCount })
})

// POST /api/tithe-commitments/mark-as-debt
titheCommitmentsRouter.post('/mark-as-debt', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const { commitmentIds } = await c.req.json()
  if (!commitmentIds?.length) {
    return c.json({ error: 'Select at least one commitment' }, 400)
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
    return c.json({ error: 'No pending commitments to move' }, 400)
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
