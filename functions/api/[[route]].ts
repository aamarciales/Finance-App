import { handle } from 'hono/cloudflare-pages'
import app from '../../src/server/app'

// Legacy Pages Functions entry — kept for reference. Production deploy uses src/worker.ts.
export const onRequest = handle(app)
