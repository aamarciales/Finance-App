import { Hono } from 'hono'
import { createClerkClient } from '@clerk/backend'
import type { AppEnv } from '../types'

export const suiteAuthRouter = new Hono<AppEnv>()

/** Short-lived ticket so trakll can open Patrimonio (and vice versa) with the same Clerk user. */
suiteAuthRouter.post('/sign-in-token', async (c) => {
  const userId = c.get('userId')
  const clerk = createClerkClient({ secretKey: c.env.CLERK_SECRET_KEY })
  const token = await clerk.signInTokens.createSignInToken({
    userId,
    expiresInSeconds: 120,
  })
  return c.json({ token: token.token })
})
