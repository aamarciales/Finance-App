import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'
import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '../../src/server/schema'
import type { AppEnv } from '../../src/server/types'
import { settingsRouter } from '../../src/server/routes/settings'
import { categoriesRouter } from '../../src/server/routes/categories'

const app = new Hono<AppEnv>().basePath('/api')

// Middleware de autenticación de Clerk
app.use('*', async (c, next) => {
  const authMiddleware = clerkMiddleware({
    secretKey: c.env.CLERK_SECRET_KEY,
    publishableKey: c.env.CLERK_PUBLISHABLE_KEY,
  })
  return authMiddleware(c, next)
})

// Montar sub-rutas
app.route('/settings', settingsRouter)
app.route('/categories', categoriesRouter)

// Rutas directas (temporalmente hasta moverlas a su router)
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

export const onRequest = handle(app)
