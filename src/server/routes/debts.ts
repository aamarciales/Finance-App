import { Hono } from 'hono'
import { getAuth } from '@hono/clerk-auth'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and } from 'drizzle-orm'
import * as schema from '../schema'
import type { AppEnv } from '../types'

export const debtsRouter = new Hono<AppEnv>()

debtsRouter.get('/', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)
  
  const db = drizzle(c.env.DB, { schema })
  const results = await db.query.debts.findMany({
    where: (d, { eq }) => eq(d.userId, auth.userId),
  })
  
  return c.json(results)
})

debtsRouter.post('/', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)
  
  const body = await c.req.json()
  const db = drizzle(c.env.DB, { schema })
  
  const result = await db.insert(schema.debts).values({
    ...body,
    userId: auth.userId,
    createdAt: new Date().toISOString(),
  }).returning()
  
  return c.json(result[0])
})

debtsRouter.put('/:id', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)
  
  const id = parseInt(c.req.param('id'), 10)
  const body = await c.req.json()
  const db = drizzle(c.env.DB, { schema })
  
  const result = await db.update(schema.debts).set({
    ...body,
  }).where(
    and(eq(schema.debts.id, id), eq(schema.debts.userId, auth.userId))
  ).returning()
  
  return c.json(result[0])
})

debtsRouter.delete('/:id', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)
  
  const id = parseInt(c.req.param('id'), 10)
  const db = drizzle(c.env.DB, { schema })
  
  await db.delete(schema.debts).where(
    and(eq(schema.debts.id, id), eq(schema.debts.userId, auth.userId))
  )
  
  return c.json({ success: true })
})
