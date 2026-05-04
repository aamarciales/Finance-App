import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '../../src/server/schema'

const app = new Hono().basePath('/api/test-db')

app.get('/', async (c) => {
  try {
    const db = drizzle(c.env.DB, { schema })
    // fetch transactions just like the real API
    const results = await db.query.transactions.findMany({
      orderBy: (t, { desc }) => [desc(t.date), desc(t.createdAt)],
    })
    return c.json({ success: true, count: results.length })
  } catch (err) {
    return c.json({ success: false, error: String(err), stack: err.stack }, 500)
  }
})

export const onRequest = handle(app)
