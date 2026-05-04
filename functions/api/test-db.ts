import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '../../src/server/schema'

const app = new Hono()

app.get('/', async (c) => {
  try {
    const db = drizzle(c.env.DB, { schema })
    const results = await db.query.categories.findMany()
    return c.json({ success: true, count: results.length })
  } catch (err) {
    return c.json({ success: false, error: String(err) }, 500)
  }
})

export const onRequest = handle(app)
