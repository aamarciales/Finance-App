import { Hono } from 'hono'
import { getAuth } from '@hono/clerk-auth'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and } from 'drizzle-orm'
import * as schema from '../schema'
import type { AppEnv } from '../types'

export const settingsRouter = new Hono<AppEnv>()

// GET /api/settings
settingsRouter.get('/', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)
  
  const db = drizzle(c.env.DB, { schema })
  const results = await db.query.settings.findMany({
    where: (s, { eq }) => eq(s.userId, auth.userId)
  })
  
  return c.json(results)
})

// GET /api/settings/:key
settingsRouter.get('/:key', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)
  
  const key = c.req.param('key')
  const db = drizzle(c.env.DB, { schema })
  
  const result = await db.query.settings.findFirst({
    where: (s, { eq, and }) => and(eq(s.userId, auth.userId), eq(s.key, key))
  })
  
  return c.json(result ? result.value : null)
})

// PUT /api/settings/:key
settingsRouter.put('/:key', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)
  
  const key = c.req.param('key')
  const body = await c.req.json()
  const db = drizzle(c.env.DB, { schema })
  
  // Upsert pattern
  const existing = await db.query.settings.findFirst({
    where: (s, { eq, and }) => and(eq(s.userId, auth.userId), eq(s.key, key))
  })
  
  if (existing) {
    await db.update(schema.settings)
      .set({ value: body })
      .where(and(eq(schema.settings.userId, auth.userId), eq(schema.settings.key, key)))
  } else {
    await db.insert(schema.settings).values({
      userId: auth.userId,
      key,
      value: body,
    })
  }
  
  return c.json({ success: true })
})
