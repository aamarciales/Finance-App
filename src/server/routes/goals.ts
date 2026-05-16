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
    name: body.name,
    description: body.description ?? null,
    targetAmount: body.targetAmount,
    currentAmount: body.currentAmount ?? 0,
    monthlyContribution: body.monthlyContribution ?? null,
    targetDate: body.targetDate ?? null,
    currency: body.currency,
    color: body.color,
    iconKey: body.iconKey,
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
  
  const updates: Record<string, any> = {}
  const allowedFields = ['name', 'description', 'targetAmount', 'currentAmount', 'monthlyContribution', 'targetDate', 'currency', 'color', 'iconKey']
  for (const key of allowedFields) {
    if (body[key] !== undefined) updates[key] = body[key]
  }

  const result = await db.update(schema.goals).set(updates).where(
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
