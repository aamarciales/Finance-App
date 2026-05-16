import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'
import { clerkMiddleware } from '@hono/clerk-auth'
import type { AppEnv } from '../../src/server/types'
import { settingsRouter } from '../../src/server/routes/settings'
import { categoriesRouter } from '../../src/server/routes/categories'
import { transactionsRouter } from '../../src/server/routes/transactions'
import { debtsRouter } from '../../src/server/routes/debts'
import { goalsRouter } from '../../src/server/routes/goals'
import { invoicesRouter } from '../../src/server/routes/invoices'
import { invoiceItemsRouter } from '../../src/server/routes/invoiceItems'
import { tithePaymentsRouter } from '../../src/server/routes/tithePayments'
import { titheCommitmentsRouter } from '../../src/server/routes/titheCommitments'
import { adminRouter } from '../../src/server/routes/admin'
import { filesRouter } from '../../src/server/routes/files'

const app = new Hono<AppEnv>().basePath('/api')

// Middleware de autenticación de Clerk
app.use('*', async (c, next) => {
  const authMiddleware = clerkMiddleware({
    secretKey: c.env.CLERK_SECRET_KEY,
    publishableKey: c.env.CLERK_PUBLISHABLE_KEY || c.env.VITE_CLERK_PUBLISHABLE_KEY,
  })
  return authMiddleware(c, next)
})

// Montar sub-rutas
app.route('/settings', settingsRouter)
app.route('/categories', categoriesRouter)
app.route('/transactions', transactionsRouter)
app.route('/debts', debtsRouter)
app.route('/goals', goalsRouter)
app.route('/invoices', invoicesRouter)
app.route('/invoice-items', invoiceItemsRouter)
app.route('/tithe-payments', tithePaymentsRouter)
app.route('/tithe-commitments', titheCommitmentsRouter)
app.route('/admin', adminRouter)
app.route('/files', filesRouter)

export const onRequest = handle(app)
