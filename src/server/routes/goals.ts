import { Hono } from 'hono'
import { getAuth } from '@hono/clerk-auth'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and } from 'drizzle-orm'
import * as schema from '../schema'
import type { AppEnv } from '../types'

export const goalsRouter = new Hono<AppEnv>()

goalsRouter.get('/', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)
  
  const db = drizzle(c.env.DB, { schema })
  const results = await db.query.goals.findMany({
    where: (g, { eq }) => eq(g.userId, auth.userId),
  })
  
  return c.json(results)
})

goalsRouter.post('/', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)
  
  const body = await c.req.json()
  const db = drizzle(c.env.DB, { schema })
  
  const result = await db.insert(schema.goals).values({
    ...body,
    userId: auth.userId,
    createdAt: new Date().toISOString(),
  }).returning()
  
  return c.json(result[0])
})

goalsRouter.put('/:id', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)
  
  const id = parseInt(c.req.param('id'), 10)
  const body = await c.req.json()
  const db = drizzle(c.env.DB, { schema })
  
  const result = await db.update(schema.goals).set({
    ...body,
  }).where(
    and(eq(schema.goals.id, id), eq(schema.goals.userId, auth.userId))
  ).returning()
  
  return c.json(result[0])
})

goalsRouter.delete('/:id', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)
  
  const id = parseInt(c.req.param('id'), 10)
  const db = drizzle(c.env.DB, { schema })
  
  await db.delete(schema.goals).where(
    and(eq(schema.goals.id, id), eq(schema.goals.userId, auth.userId))
  )
  
  return c.json({ success: true })
})
