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

  const statusParam = c.req.query('status') as 'pending' | 'paid' | null
  const db = drizzle(c.env.DB, { schema })

  const results = await db.query.titheCommitments.findMany({
    where: statusParam
      ? (tc, { eq, and }) => and(eq(tc.userId, auth.userId), eq(tc.status, statusParam))
      : (tc, { eq }) => eq(tc.userId, auth.userId),
    orderBy: (tc, { desc }) => [desc(tc.date)],
  })

  return c.json(results)
})

// GET /api/tithe-commitments/pending-summary
titheCommitmentsRouter.get('/pending-summary', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const db = drizzle(c.env.DB, { schema })

  const result = await db
    .select({
      totalPending: sql<number>`COALESCE(SUM(CASE WHEN ${schema.titheCommitments.status} = 'pending' THEN ${schema.titheCommitments.totalAmount} ELSE 0 END), 0)`,
      totalPaid: sql<number>`COALESCE(SUM(CASE WHEN ${schema.titheCommitments.status} = 'paid' THEN ${schema.titheCommitments.totalAmount} ELSE 0 END), 0)`,
      pendingCount: sql<number>`COALESCE(SUM(CASE WHEN ${schema.titheCommitments.status} = 'pending' THEN 1 ELSE 0 END), 0)`,
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

  await db
    .delete(schema.titheCommitments)
    .where(and(eq(schema.titheCommitments.id, id), eq(schema.titheCommitments.userId, auth.userId)))

  return c.json({ success: true })
})
