import { Hono } from 'hono'
import { getAuth } from '@hono/clerk-auth'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and } from 'drizzle-orm'
import * as schema from '../schema'
import type { AppEnv } from '../types'

export const categoriesRouter = new Hono<AppEnv>()

// GET /api/categories
categoriesRouter.get('/', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const db = drizzle(c.env.DB, { schema })

  // Auto-seed system categories for new users
  const existing = await db
    .select({ id: schema.categories.id })
    .from(schema.categories)
    .where(and(eq(schema.categories.userId, auth.userId), eq(schema.categories.isSystem, true)))

  if (existing.length === 0) {
    const SYSTEM_CATEGORIES = [
      { name: 'Supermercado',        color: '#10B981', icon: 'shopping-cart',   type: 'expense' as const },
      { name: 'Comida fuera',        color: '#F59E0B', icon: 'utensils',        type: 'expense' as const },
      { name: 'Vivienda',            color: '#3B82F6', icon: 'home',            type: 'expense' as const },
      { name: 'Servicios',           color: '#06B6D4', icon: 'zap',             type: 'expense' as const },
      { name: 'Suscripciones',       color: '#8B5CF6', icon: 'calendar',        type: 'expense' as const },
      { name: 'Transporte',          color: '#F97316', icon: 'car',             type: 'expense' as const },
      { name: 'Salud',               color: '#EF4444', icon: 'heart',           type: 'expense' as const },
      { name: 'Educación',           color: '#6366F1', icon: 'book',            type: 'expense' as const },
      { name: 'Hogar',               color: '#A78BFA', icon: 'sofa',            type: 'expense' as const },
      { name: 'Cuidado personal',    color: '#EC4899', icon: 'sparkles',        type: 'expense' as const },
      { name: 'Diezmo y Ofrenda',    color: '#B8923A', icon: 'heart-handshake', type: 'expense' as const },
      { name: 'Deuda',               color: '#A83E2B', icon: 'credit-card',     type: 'expense' as const },
      { name: 'Impuestos',           color: '#78716C', icon: 'landmark',        type: 'expense' as const },
      { name: 'Comisiones bancarias',color: '#9CA3AF', icon: 'banknote',        type: 'expense' as const },
      { name: 'Mascotas',            color: '#FB923C', icon: 'paw-print',       type: 'expense' as const },
      { name: 'Otros',               color: '#9CA3AF', icon: 'more-horizontal', type: 'expense' as const },
      { name: 'Sueldo',              color: '#2D4A3E', icon: 'briefcase',       type: 'income'  as const },
      { name: 'Freelance',           color: '#10B981', icon: 'code',            type: 'income'  as const },
      { name: 'Adelanto',            color: '#84CC16', icon: 'trending-up',     type: 'income'  as const },
      { name: 'Cobro deuda',         color: '#22C55E', icon: 'hand-coins',      type: 'income'  as const },
      { name: 'Otros ingresos',      color: '#14B8A6', icon: 'plus-circle',     type: 'income'  as const },
      { name: 'Transferencias',      color: '#6B7280', icon: 'refresh-cw',      type: 'expense' as const },
    ]
    for (const cat of SYSTEM_CATEGORIES) {
      await db.insert(schema.categories).values({
        ...cat,
        userId: auth.userId,
        isSystem: true,
      })
    }
  }

  const results = await db.query.categories.findMany({
    where: (cat, { eq }) => eq(cat.userId, auth.userId),
  })

  return c.json(results)
})

// POST /api/categories
categoriesRouter.post('/', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)
  
  const body = await c.req.json()
  const db = drizzle(c.env.DB, { schema })
  
  const result = await db.insert(schema.categories).values({
    name: body.name,
    color: body.color,
    icon: body.icon,
    type: body.type,
    isSystem: body.isSystem ?? false,
    userId: auth.userId,
  }).returning()
  
  return c.json(result[0])
})

// PUT /api/categories/:id
categoriesRouter.put('/:id', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const id = parseInt(c.req.param('id'), 10)
  const body = await c.req.json()
  const db = drizzle(c.env.DB, { schema })

  const updates: Record<string, any> = {}
  const allowedFields = ['name', 'color', 'icon', 'type', 'isSystem']
  for (const key of allowedFields) {
    if (body[key] !== undefined) updates[key] = body[key]
  }

  const result = await db.update(schema.categories).set(updates).where(
    and(eq(schema.categories.id, id), eq(schema.categories.userId, auth.userId))
  ).returning()

  return c.json(result[0])
})

// DELETE /api/categories/:id
categoriesRouter.delete('/:id', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)
  
  const id = parseInt(c.req.param('id'), 10)
  const db = drizzle(c.env.DB, { schema })
  
  await db.delete(schema.categories).where(
    and(eq(schema.categories.id, id), eq(schema.categories.userId, auth.userId))
  )
  
  return c.json({ success: true })
})
