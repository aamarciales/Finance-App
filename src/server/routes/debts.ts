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
    name: body.name,
    creditor: body.creditor,
    type: body.type,
    originalAmount: body.originalAmount,
    currentBalance: body.currentBalance,
    currency: body.currency,
    interestRate: body.interestRate ?? null,
    monthlyPayment: body.monthlyPayment ?? null,
    totalInstallments: body.totalInstallments ?? 0,
    paidInstallments: body.paidInstallments ?? 0,
    nextPaymentDate: body.nextPaymentDate ?? null,
    notes: body.notes ?? null,
    isPaid: body.isPaid ?? false,
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
  
  const updates: Record<string, any> = {}
  const allowedFields = ['name', 'creditor', 'type', 'originalAmount', 'currentBalance', 'currency', 'interestRate', 'monthlyPayment', 'totalInstallments', 'paidInstallments', 'nextPaymentDate', 'notes', 'isPaid']
  for (const key of allowedFields) {
    if (body[key] !== undefined) updates[key] = body[key]
  }

  const result = await db.update(schema.debts).set(updates).where(
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
