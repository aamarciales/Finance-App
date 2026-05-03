import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'
import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '../../src/server/schema'

type Bindings = {
  DB: D1Database
  CLERK_PUBLISHABLE_KEY: string
  CLERK_SECRET_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>().basePath('/api')

// Middleware de autenticación de Clerk
app.use('*', async (c, next) => {
  const authMiddleware = clerkMiddleware({
    secretKey: c.env.CLERK_SECRET_KEY,
    publishableKey: c.env.CLERK_PUBLISHABLE_KEY,
  })
  return authMiddleware(c, next)
})

// Rutas de ejemplo (Transactions)
app.get('/transactions', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const db = drizzle(c.env.DB, { schema })
  const txs = await db.query.transactions.findMany({
    where: (t, { eq }) => eq(t.userId, auth.userId),
    orderBy: (t, { desc }) => [desc(t.date)],
  })

  return c.json(txs)
})

// Iremos añadiendo el resto de rutas (POST, PUT, DELETE) para Invoices, Categorías, etc.
// durante la Fase 4 de Refactorización.

export const onRequest = handle(app)
