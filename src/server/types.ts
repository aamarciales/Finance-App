import type { D1Database, R2Bucket } from '@cloudflare/workers-types'

export type Bindings = {
  DB: D1Database
  FILES: R2Bucket
  CLERK_PUBLISHABLE_KEY?: string
  VITE_CLERK_PUBLISHABLE_KEY?: string
  CLERK_SECRET_KEY: string
  ANTHROPIC_API_KEY?: string
  /** Shared secret from trakll PATRIMONIO_INTEGRATION_SECRET */
  TRAKLL_INTEGRATION_SECRET?: string
  /** Clerk user id that receives synced trakll income transactions */
  TRAKLL_INTEGRATION_USER_ID?: string
}

export type AuthVars = {
  userId: string
  clerkAuth: (options?: unknown) => { userId: string | null }
}

export type AppEnv = {
  Bindings: Bindings
  Variables: AuthVars
}
