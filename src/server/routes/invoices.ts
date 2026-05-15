import { Hono } from 'hono'
import { getAuth } from '@hono/clerk-auth'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and } from 'drizzle-orm'
import * as schema from '../schema'
import type { AppEnv } from '../types'

export const invoicesRouter = new Hono<AppEnv>()

invoicesRouter.get('/', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)
  
  const db = drizzle(c.env.DB, { schema })
  const results = await db.query.invoices.findMany({
    where: (i, { eq }) => eq(i.userId, auth.userId),
  })
  
  return c.json(results)
})

invoicesRouter.post('/', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)
  
  const body = await c.req.json()

  if (body.currency === 'COP' && (!body.trm || body.trm <= 1)) {
    return c.json({ error: 'TRM inválida para moneda COP. Debe ser mayor a 1.' }, 400)
  }

  const db = drizzle(c.env.DB, { schema })

  const result = await db.insert(schema.invoices).values({
    ...body,
    userId: auth.userId,
    createdAt: new Date().toISOString(),
  }).returning()
  
  return c.json(result[0])
})

invoicesRouter.put('/:id', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)
  
  const id = parseInt(c.req.param('id'), 10)
  const body = await c.req.json()
  const db = drizzle(c.env.DB, { schema })
  
  const result = await db.update(schema.invoices).set({
    ...body,
  }).where(
    and(eq(schema.invoices.id, id), eq(schema.invoices.userId, auth.userId))
  ).returning()
  
  return c.json(result[0])
})

invoicesRouter.delete('/:id', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)
  
  const id = parseInt(c.req.param('id'), 10)
  const db = drizzle(c.env.DB, { schema })
  
  await db.delete(schema.invoices).where(
    and(eq(schema.invoices.id, id), eq(schema.invoices.userId, auth.userId))
  )
  
  return c.json({ success: true })
})
