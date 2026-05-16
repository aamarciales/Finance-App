import type { D1Database, R2Bucket } from '@cloudflare/workers-types'

export type Bindings = {
  DB: D1Database
  FILES: R2Bucket
  CLERK_PUBLISHABLE_KEY?: string
  VITE_CLERK_PUBLISHABLE_KEY?: string
  CLERK_SECRET_KEY: string
  ANTHROPIC_API_KEY?: string
}

export type AppEnv = {
  Bindings: Bindings
}
