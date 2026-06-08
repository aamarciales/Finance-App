// Worker bindings and secrets. Keep in sync with wrangler.jsonc and .dev.vars.
interface Env {
  DB: D1Database
  FILES: R2Bucket
  ASSETS: Fetcher
  CLERK_SECRET_KEY: string
  CLERK_PUBLISHABLE_KEY?: string
  VITE_CLERK_PUBLISHABLE_KEY?: string
  ANTHROPIC_API_KEY?: string
  TRAKLL_INTEGRATION_SECRET?: string
  TRAKLL_INTEGRATION_USER_ID?: string
}
