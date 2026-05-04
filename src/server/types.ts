import type { D1Database } from '@cloudflare/workers-types'

export type Bindings = {
  DB: D1Database
  CLERK_PUBLISHABLE_KEY?: string
  VITE_CLERK_PUBLISHABLE_KEY?: string
  CLERK_SECRET_KEY: string
}

export type AppEnv = {
  Bindings: Bindings
}
