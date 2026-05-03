import { Hono } from 'hono'
import { getAuth } from '@hono/clerk-auth'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and } from 'drizzle-orm'
import * as schema from '../schema'
import type { AppEnv } from '../types'

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
  const db = drizzle(c.env.DB, { schema })
  
  const result = await db.insert(schema.transactions).values({
    ...body,
    userId: auth.userId,
    createdAt: new Date().toISOString(),
  }).returning()
  
  return c.json(result[0])
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
  
  await db.delete(schema.transactions).where(
    and(eq(schema.transactions.id, id), eq(schema.transactions.userId, auth.userId))
  )
  
  return c.json({ success: true })
})
