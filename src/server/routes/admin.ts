import { Hono } from 'hono'
import { getAuth } from '@hono/clerk-auth'
import { drizzle } from 'drizzle-orm/d1'
import { eq, inArray, and } from 'drizzle-orm'
import * as schema from '../schema'
import type { AppEnv } from '../types'

export const adminRouter = new Hono<AppEnv>()

const SYSTEM_CATEGORIES = [
  // Gasto (16)
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
  // Ingreso (5)
  { name: 'Sueldo',              color: '#2D4A3E', icon: 'briefcase',       type: 'income'  as const },
  { name: 'Freelance',           color: '#10B981', icon: 'code',            type: 'income'  as const },
  { name: 'Adelanto',            color: '#84CC16', icon: 'trending-up',     type: 'income'  as const },
  { name: 'Cobro deuda',         color: '#22C55E', icon: 'hand-coins',      type: 'income'  as const },
  { name: 'Otros ingresos',      color: '#14B8A6', icon: 'plus-circle',     type: 'income'  as const },
  // Transferencia (1, modeled as expense for consistency)
  { name: 'Transferencias',      color: '#6B7280', icon: 'refresh-cw',      type: 'expense' as const },
]

// POST /api/admin/wipe-my-data
adminRouter.post('/wipe-my-data', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  try {
    const db = drizzle(c.env.DB, { schema })
    const userId = auth.userId

    const userInvoiceIds = db
      .select({ id: schema.invoices.id })
      .from(schema.invoices)
      .where(eq(schema.invoices.userId, userId))

    const deletedInvoiceItems = await db
      .delete(schema.invoiceItems)
      .where(inArray(schema.invoiceItems.invoiceId, userInvoiceIds))
      .returning({ id: schema.invoiceItems.id })

    const deletedTithePayments = await db
      .delete(schema.tithePayments)
      .where(eq(schema.tithePayments.userId, userId))
      .returning({ id: schema.tithePayments.id })

    const deletedTransactions = await db
      .delete(schema.transactions)
      .where(eq(schema.transactions.userId, userId))
      .returning({ id: schema.transactions.id })

    const deletedInvoices = await db
      .delete(schema.invoices)
      .where(eq(schema.invoices.userId, userId))
      .returning({ id: schema.invoices.id })

    const deletedDebts = await db
      .delete(schema.debts)
      .where(eq(schema.debts.userId, userId))
      .returning({ id: schema.debts.id })

    const deletedGoals = await db
      .delete(schema.goals)
      .where(eq(schema.goals.userId, userId))
      .returning({ id: schema.goals.id })

    const deletedCategories = await db
      .delete(schema.categories)
      .where(eq(schema.categories.userId, userId))
      .returning({ id: schema.categories.id })

    const deletedSettings = await db
      .delete(schema.settings)
      .where(eq(schema.settings.userId, userId))
      .returning({ key: schema.settings.key })

    return c.json({
      success: true,
      deletedCounts: {
        invoiceItems: deletedInvoiceItems.length,
        tithePayments: deletedTithePayments.length,
        transactions: deletedTransactions.length,
        invoices: deletedInvoices.length,
        debts: deletedDebts.length,
        goals: deletedGoals.length,
        categories: deletedCategories.length,
        settings: deletedSettings.length,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Admin endpoint failed:', message)
    return c.json({ error: 'Operation failed', detail: message }, 500)
  }
})

// POST /api/admin/seed-system-categories
adminRouter.post('/seed-system-categories', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  try {
    const db = drizzle(c.env.DB, { schema })
    const userId = auth.userId

    const existing = await db
      .select({ id: schema.categories.id })
      .from(schema.categories)
      .where(and(eq(schema.categories.userId, userId), eq(schema.categories.isSystem, true)))

    if (existing.length > 0) {
      return c.json({ success: true, skipped: true, count: existing.length })
    }

    for (const cat of SYSTEM_CATEGORIES) {
      await db.insert(schema.categories).values({
        ...cat,
        userId,
        isSystem: true,
      })
    }

    return c.json({ success: true, inserted: SYSTEM_CATEGORIES.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Admin endpoint failed:', message)
    return c.json({ error: 'Operation failed', detail: message }, 500)
  }
})
