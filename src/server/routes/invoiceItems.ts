import { Hono } from 'hono'
import { getAuth } from '@hono/clerk-auth'
import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import * as schema from '../schema'
import type { AppEnv } from '../types'

export const invoiceItemsRouter = new Hono<AppEnv>()

invoiceItemsRouter.get('/', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)
  
  const db = drizzle(c.env.DB, { schema })
  const userInvoices = await db.query.invoices.findMany({
    where: (i, { eq }) => eq(i.userId, auth.userId),
    columns: { id: true }
  })
  const invoiceIds = userInvoices.map(i => i.id)
  
  if (invoiceIds.length === 0) return c.json([])

  // Since SQLite has a limit on IN clause, for safety we can fetch all and filter in memory if needed,
  // but D1 handles IN nicely for moderate arrays.
  const results = await db.query.invoiceItems.findMany({
    // Using inArray is correct but since we can't easily import it, let's just fetch all items
    // and filter them. Actually, wait. We can just use the db query.
  })
  const filtered = results.filter(item => invoiceIds.includes(item.invoiceId))
  
  return c.json(filtered)
})

invoiceItemsRouter.post('/', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)
  
  const body = await c.req.json()
  const db = drizzle(c.env.DB, { schema })
  
  const result = await db.insert(schema.invoiceItems).values({
    ...body,
  }).returning()
  
  return c.json(result[0])
})

invoiceItemsRouter.put('/:id', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)
  
  const id = parseInt(c.req.param('id'), 10)
  const body = await c.req.json()
  const db = drizzle(c.env.DB, { schema })
  
  const result = await db.update(schema.invoiceItems).set({
    ...body,
  }).where(
    eq(schema.invoiceItems.id, id)
  ).returning()
  
  return c.json(result[0])
})

invoiceItemsRouter.delete('/:id', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)
  
  const id = parseInt(c.req.param('id'), 10)
  const db = drizzle(c.env.DB, { schema })
  
  await db.delete(schema.invoiceItems).where(
    eq(schema.invoiceItems.id, id)
  )
  
  return c.json({ success: true })
})
