import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '../schema'
import type { AppEnv } from '../types'
import {
  createTrakllIncomeTransaction,
  findExistingTrakllIncome,
  trakllIncomeBodySchema,
} from '../lib/trakll-integration'

export const integrationsRouter = new Hono<AppEnv>()

const INTEGRATION_SECRET_HEADER = 'x-integration-secret'

function assertIntegrationSecret(c: { req: { header: (name: string) => string | undefined }; env: AppEnv['Bindings'] }) {
  const provided = c.req.header(INTEGRATION_SECRET_HEADER)
  const expected = c.env.TRAKLL_INTEGRATION_SECRET
  if (!expected || !provided || provided !== expected) {
    return false
  }
  return true
}

// POST /api/integrations/trakll/income — server-to-server from trakll when invoice is paid
integrationsRouter.post('/trakll/income', async (c) => {
  if (!assertIntegrationSecret(c)) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const userId = c.env.TRAKLL_INTEGRATION_USER_ID
  if (!userId) {
    return c.json({ error: 'Integration user not configured' }, 503)
  }

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const parsed = trakllIncomeBodySchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400)
  }

  const db = drizzle(c.env.DB, { schema })

  const existing = await findExistingTrakllIncome(db, userId, parsed.data.externalId)
  if (existing?.id) {
    return c.json({ id: existing.id, created: false })
  }

  try {
    const tx = await createTrakllIncomeTransaction(db, userId, parsed.data)
    if (!tx?.id) {
      return c.json({ error: 'Failed to create transaction' }, 500)
    }
    return c.json({ id: tx.id, created: true })
  } catch (err) {
    if (err instanceof Error && err.message === 'NO_INCOME_CATEGORY') {
      return c.json({ error: 'No income category configured for trakll sync' }, 422)
    }
    console.error('[trakll-integration] create failed', err)
    return c.json({ error: 'Internal error' }, 500)
  }
})
