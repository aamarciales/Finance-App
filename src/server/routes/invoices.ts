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

  const values: Record<string, any> = {
    userId: auth.userId,
    createdAt: new Date().toISOString(),
  }
  const allowedFields = ['transactionId', 'date', 'merchant', 'branch', 'total', 'currency', 'trm', 'itemCount', 'ocrConfidence', 'attachmentUrl']
  for (const key of allowedFields) {
    if (body[key] !== undefined) values[key] = body[key]
  }

  try {
    const result = await db.insert(schema.invoices).values(values as any).returning()
    return c.json(result[0])
  } catch (err) {
    console.error('Invoice insert error:', err)
    return c.json({ error: 'Error al crear factura: ' + (err instanceof Error ? err.message : String(err)) }, 500)
  }
})

invoicesRouter.put('/:id', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const id = parseInt(c.req.param('id'), 10)
  const body = await c.req.json()
  const db = drizzle(c.env.DB, { schema })

  const updates: Record<string, any> = {}
  const allowedFields = ['transactionId', 'date', 'merchant', 'branch', 'total', 'currency', 'trm', 'itemCount', 'ocrConfidence', 'attachmentUrl']
  for (const key of allowedFields) {
    if (body[key] !== undefined) updates[key] = body[key]
  }

  try {
    const result = await db.update(schema.invoices).set(updates).where(
      and(eq(schema.invoices.id, id), eq(schema.invoices.userId, auth.userId))
    ).returning()

    return c.json(result[0])
  } catch (err) {
    console.error('Invoice update error:', err)
    return c.json({ error: 'Error al actualizar factura: ' + (err instanceof Error ? err.message : String(err)) }, 500)
  }
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
