import { Hono } from 'hono'
import type { AppEnv } from './types'
import { requireAuth } from './middleware/auth'
import { settingsRouter } from './routes/settings'
import { categoriesRouter } from './routes/categories'
import { transactionsRouter } from './routes/transactions'
import { debtsRouter } from './routes/debts'
import { goalsRouter } from './routes/goals'
import { invoicesRouter } from './routes/invoices'
import { invoiceItemsRouter } from './routes/invoiceItems'
import { tithePaymentsRouter } from './routes/tithePayments'
import { titheCommitmentsRouter } from './routes/titheCommitments'
import { adminRouter } from './routes/admin'
import { filesRouter } from './routes/files'
import { integrationsRouter } from './routes/integrations'
import { suiteAuthRouter } from './routes/suite-auth'

const app = new Hono<AppEnv>().basePath('/api')

app.get('/health', (c) => c.json({ status: 'ok', at: Date.now() }))

// Server-to-server (trakll paid invoices → income); mounted before Clerk.
app.route('/integrations', integrationsRouter)

// Integrations use a shared secret; everything else needs a Clerk session JWT.
app.use('*', async (c, next) => {
  // basePath('/api') — path is relative to /api, not the full URL path.
  if (c.req.path.startsWith('/integrations')) {
    return next()
  }
  return requireAuth(c, async () => {
    const userId = c.get('userId')
    // Route handlers call getAuth(c) from @hono/clerk-auth — provide a minimal auth object.
    c.set('clerkAuth', () => ({ userId }))
    await next()
  })
})

app.route('/suite-auth', suiteAuthRouter)
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

// Unknown /api/* → JSON 404 (do not fall through to index.html).
app.all('/*', (c) =>
  c.json({ error: { code: 'not_found', message: 'Unknown API route' } }, 404),
)

export default app
