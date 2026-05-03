import { Hono } from 'hono'
import { getAuth } from '@hono/clerk-auth'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and } from 'drizzle-orm'
import * as schema from '../schema'
import type { AppEnv } from '../types'

export const categoriesRouter = new Hono<AppEnv>()

// GET /api/categories
categoriesRouter.get('/', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)
  
  const db = drizzle(c.env.DB, { schema })
  const results = await db.query.categories.findMany({
    where: (cat, { eq }) => eq(cat.userId, auth.userId),
  })
  
  return c.json(results)
})

// POST /api/categories
categoriesRouter.post('/', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)
  
  const body = await c.req.json()
  const db = drizzle(c.env.DB, { schema })
  
  const result = await db.insert(schema.categories).values({
    ...body,
    userId: auth.userId,
  }).returning()
  
  return c.json(result[0])
})

// DELETE /api/categories/:id
categoriesRouter.delete('/:id', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)
  
  const id = parseInt(c.req.param('id'), 10)
  const db = drizzle(c.env.DB, { schema })
  
  await db.delete(schema.categories).where(
    and(eq(schema.categories.id, id), eq(schema.categories.userId, auth.userId))
  )
  
  return c.json({ success: true })
})
