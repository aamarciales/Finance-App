import { createMiddleware } from 'hono/factory'
import { verifyToken } from '@clerk/backend'
import type { AppEnv } from '../types'

/** Verifies Clerk JWT with secret key only — no publishable key required in Worker env. */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header('Authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  try {
    const claims = await verifyToken(token, {
      secretKey: c.env.CLERK_SECRET_KEY,
    })
    if (!claims.sub) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    c.set('userId', claims.sub)
    await next()
  } catch {
    return c.json({ error: 'Unauthorized' }, 401)
  }
})
