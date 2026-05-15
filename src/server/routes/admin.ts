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

// POST /api/admin/import-bulk
adminRouter.post('/import-bulk', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const userId = auth.userId
  const db = drizzle(c.env.DB, { schema })
  const log: string[] = []

  try {
    const payload = await c.req.json()
    const now = new Date().toISOString()

    // -------------------------------------------------------------------------
    // 1) WIPE (idéntico al endpoint /wipe-my-data, pero inline)
    // -------------------------------------------------------------------------
    const userInvoiceIds = db
      .select({ id: schema.invoices.id })
      .from(schema.invoices)
      .where(eq(schema.invoices.userId, userId))

    await db.delete(schema.invoiceItems).where(inArray(schema.invoiceItems.invoiceId, userInvoiceIds))
    await db.delete(schema.tithePayments).where(eq(schema.tithePayments.userId, userId))
    await db.delete(schema.transactions).where(eq(schema.transactions.userId, userId))
    await db.delete(schema.invoices).where(eq(schema.invoices.userId, userId))
    await db.delete(schema.debts).where(eq(schema.debts.userId, userId))
    await db.delete(schema.goals).where(eq(schema.goals.userId, userId))
    await db.delete(schema.categories).where(eq(schema.categories.userId, userId))
    await db.delete(schema.settings).where(eq(schema.settings.userId, userId))
    log.push('Wipe completado')

    // -------------------------------------------------------------------------
    // 2) SEED categorías sistema
    // -------------------------------------------------------------------------
    for (const cat of SYSTEM_CATEGORIES) {
      await db.insert(schema.categories).values({
        ...cat,
        userId,
        isSystem: true,
      })
    }
    log.push(`Seed: ${SYSTEM_CATEGORIES.length} categorías sistema`)

    // -------------------------------------------------------------------------
    // 3) Crear categorías custom del JSON (si vienen)
    // -------------------------------------------------------------------------
    const customCats = (payload.categories ?? []) as Array<{
      name: string
      type: 'income' | 'expense'
      color?: string
      icon?: string
    }>
    for (const cat of customCats) {
      await db.insert(schema.categories).values({
        userId,
        name: cat.name,
        type: cat.type,
        color: cat.color ?? '#9CA3AF',
        icon: cat.icon ?? 'tag',
        isSystem: false,
      })
    }
    log.push(`Custom categories: ${customCats.length}`)

    // -------------------------------------------------------------------------
    // 4) Resolver name → id de TODAS las categorías
    // -------------------------------------------------------------------------
    const allCats = await db
      .select({ id: schema.categories.id, name: schema.categories.name })
      .from(schema.categories)
      .where(eq(schema.categories.userId, userId))
    const catNameToId = new Map<string, number>()
    for (const c of allCats) catNameToId.set(c.name, c.id)

    // -------------------------------------------------------------------------
    // 5) Crear deudas y armar mapa name → id
    // -------------------------------------------------------------------------
    const debtNameToId = new Map<string, number>()
    const debts = (payload.debts ?? []) as any[]
    for (const d of debts) {
      const result = await db.insert(schema.debts).values({
        userId,
        name: d.name,
        creditor: d.creditor,
        type: d.type,
        originalAmount: d.originalAmount,
        currentBalance: d.currentBalance,
        currency: d.currency,
        interestRate: d.interestRate ?? null,
        monthlyPayment: d.monthlyPayment ?? null,
        totalInstallments: d.totalInstallments ?? null,
        paidInstallments: d.paidInstallments ?? null,
        nextPaymentDate: d.nextPaymentDate ?? null,
        notes: d.notes ?? null,
        createdAt: now,
      }).returning()
      debtNameToId.set(d.name, result[0].id)
    }
    log.push(`Deudas creadas: ${debts.length}`)

    // -------------------------------------------------------------------------
    // Helper para calcular amountInBase y amountInSecondary
    // -------------------------------------------------------------------------
    function calcAmounts(amount: number, currency: string, trm: number) {
      let base = amount, secondary = amount
      if (currency === 'USD') {
        base = amount
        secondary = amount * trm
      } else if (currency === 'COP') {
        base = trm > 0 ? amount / trm : amount
        secondary = amount
      } else if (currency === 'EUR') {
        base = amount * 1.08
        secondary = amount * trm * 1.08
      }
      return { base: Math.round(base * 10000) / 10000, secondary: Math.round(secondary * 100) / 100 }
    }

    // -------------------------------------------------------------------------
    // 6) Crear transacciones sueltas
    // -------------------------------------------------------------------------
    const looseTxs = (payload.transactions ?? []) as any[]
    let looseCreated = 0
    const skipped: string[] = []
    for (const tx of looseTxs) {
      const catId = catNameToId.get(tx.category)
      if (!catId) {
        skipped.push(`TX skip cat='${tx.category}': ${tx.concept}`)
        continue
      }
      const debtId = tx.debtRef ? (debtNameToId.get(tx.debtRef) ?? null) : null
      const trm = (tx.trm && tx.trm > 0) ? tx.trm : 1.0
      if (tx.currency === 'COP' && trm <= 1) {
        return c.json({ error: `TRM inválida (=${trm}) para transacción COP "${tx.concept}". TRM debe ser > 1.` }, 400)
      }
      const { base, secondary } = calcAmounts(tx.amount, tx.currency, trm)

      await db.insert(schema.transactions).values({
        userId,
        date: tx.date,
        type: tx.type,
        concept: tx.concept,
        categoryId: catId,
        amount: tx.amount,
        currency: tx.currency,
        trm,
        amountInBase: base,
        amountInSecondary: secondary,
        invoiceId: null,
        debtId,
        isTitheCalculated: false,
        createdAt: now,
        updatedAt: now,
      })
      looseCreated++
    }
    log.push(`Transacciones sueltas: ${looseCreated}/${looseTxs.length}`)
    if (skipped.length) log.push(...skipped.slice(0, 5))

    // -------------------------------------------------------------------------
    // 7) Crear facturas con su transacción + items
    // -------------------------------------------------------------------------
    const invoices = (payload.invoices ?? []) as any[]
    let invCreated = 0
    let itemsCreated = 0
    for (const inv of invoices) {
      const catId = catNameToId.get(inv.category)
      if (!catId) {
        skipped.push(`INV skip cat='${inv.category}': ${inv.merchant}`)
        continue
      }
      const trm = (inv.trm && inv.trm > 0) ? inv.trm : 1.0
      if (inv.currency === 'COP' && trm <= 1) {
        return c.json({ error: `TRM inválida (=${trm}) para factura COP "${inv.merchant}". TRM debe ser > 1.` }, 400)
      }
      const { base, secondary } = calcAmounts(inv.total, inv.currency, trm)

      // 7a) Transacción (sin invoiceId todavía)
      const txResult = await db.insert(schema.transactions).values({
        userId,
        date: inv.date,
        type: 'expense',
        concept: inv.transaction?.concept ?? `Compra ${inv.merchant}`,
        categoryId: catId,
        amount: inv.total,
        currency: inv.currency,
        trm,
        amountInBase: base,
        amountInSecondary: secondary,
        invoiceId: null,
        debtId: null,
        isTitheCalculated: false,
        createdAt: now,
        updatedAt: now,
      }).returning()
      const txId = txResult[0].id

      // 7b) Invoice con transactionId
      const invResult = await db.insert(schema.invoices).values({
        userId,
        transactionId: txId,
        date: inv.date,
        merchant: inv.merchant,
        total: inv.total,
        currency: inv.currency,
        trm,
        itemCount: (inv.items ?? []).length,
        invoiceNumber: inv.externalId ?? null,
        paymentMethod: inv.paymentMethod ?? null,
        location: inv.location ?? null,
        notes: inv.transaction?.notes ?? null,
        attachmentUrl: null,
        createdAt: now,
      }).returning()
      const invId = invResult[0].id

      // 7c) Update transacción para apuntar a la invoice
      await db.update(schema.transactions)
        .set({ invoiceId: invId })
        .where(and(eq(schema.transactions.id, txId), eq(schema.transactions.userId, userId)))

      // 7d) Items
      for (const it of (inv.items ?? [])) {
        await db.insert(schema.invoiceItems).values({
          invoiceId: invId,
          name: it.name,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          totalPrice: it.totalPrice,
          subCategory: it.subCategory ?? null,
          barcode: it.barcode ?? null,
        })
        itemsCreated++
      }
      invCreated++
    }
    log.push(`Facturas: ${invCreated}/${invoices.length} con ${itemsCreated} items`)

    // -------------------------------------------------------------------------
    // 8) Settings.titheConfig (resolver names → ids)
    // -------------------------------------------------------------------------
    const settingsObj = payload.settings ?? {}
    const titheConfig = settingsObj.titheConfig ?? null
    if (titheConfig) {
      const byName = (titheConfig.tithePercentByIncomeCategory ?? {}) as Record<string, { tithe: number; offering: number }>
      const byId: Record<string, { tithe: number; offering: number }> = {}
      for (const [name, percentages] of Object.entries(byName)) {
        const cId = catNameToId.get(name)
        if (cId) byId[String(cId)] = percentages
      }
      const finalConfig = {
        tithePercentByIncomeCategory: byId,
        defaultTithe: titheConfig.defaultTithe ?? 10,
        defaultOffering: titheConfig.defaultOffering ?? 10,
        destination: titheConfig.destination ?? 'Iglesia local',
      }
      await db.insert(schema.settings).values({
        key: 'titheConfig',
        userId,
        value: finalConfig as any,
      })
      log.push(`titheConfig guardado con ${Object.keys(byId).length} categorías mapeadas`)
    }

    return c.json({
      success: true,
      log,
      counts: {
        categories: customCats.length + SYSTEM_CATEGORIES.length,
        debts: debts.length,
        looseTransactions: looseCreated,
        invoices: invCreated,
        invoiceItems: itemsCreated,
      },
      skipped,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Bulk import failed:', message)
    return c.json({ error: 'Bulk import failed', detail: message, log }, 500)
  }
})
