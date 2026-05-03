import { db } from './schema'
import type { AppSettings, Category } from '@/types/domain'

const DEFAULT_CATEGORIES: Category[] = [
  { id: 1, name: 'Supermercado', color: '#2d4a3e', icon: 'shopping-cart', type: 'expense', isSystem: true },
  { id: 2, name: 'Comida fuera', color: '#b8923a', icon: 'utensils', type: 'expense', isSystem: true },
  { id: 3, name: 'Transporte', color: '#c4621d', icon: 'car', type: 'expense', isSystem: true },
  { id: 4, name: 'Servicios', color: '#5a4ea0', icon: 'globe', type: 'expense', isSystem: true },
  { id: 5, name: 'Salud', color: '#4a6e8a', icon: 'heart-pulse', type: 'expense', isSystem: true },
  { id: 6, name: 'Educación', color: '#7a4a6e', icon: 'book-open', type: 'expense', isSystem: true },
  { id: 7, name: 'Hogar', color: '#8a6a4a', icon: 'home', type: 'expense', isSystem: true },
  { id: 8, name: 'Diezmo', color: '#b8923a', icon: 'shield', type: 'expense', isSystem: true },
  { id: 9, name: 'Ofrendas', color: '#d4b974', icon: 'heart', type: 'expense', isSystem: true },
  { id: 10, name: 'Deuda', color: '#a83e2b', icon: 'credit-card', type: 'expense', isSystem: true },
  { id: 11, name: 'Impuestos', color: '#4a6e8a', icon: 'file-text', type: 'expense', isSystem: true },
  { id: 12, name: 'Otros', color: '#9a978d', icon: 'more-horizontal', type: 'expense', isSystem: true },
  { id: 13, name: 'Freelance', color: '#2d4a3e', icon: 'briefcase', type: 'income', isSystem: true },
  { id: 14, name: 'Sueldo', color: '#2d4a3e', icon: 'wallet', type: 'income', isSystem: true },
  { id: 15, name: 'Otros ingresos', color: '#9a978d', icon: 'plus-circle', type: 'income', isSystem: true },
  { id: 16, name: 'Transferencias', color: '#6b7280', icon: 'arrow-right-left', type: 'expense', isSystem: true },
  { id: 17, name: 'Comisiones bancarias', color: '#8a6a4a', icon: 'landmark', type: 'expense', isSystem: true },
  { id: 18, name: 'Intereses bancarios', color: '#b54a3e', icon: 'percent', type: 'expense', isSystem: true },
  { id: 19, name: 'Suscripciones', color: '#5a4ea0', icon: 'globe', type: 'expense', isSystem: true },
  { id: 20, name: 'Mascotas', color: '#8a6a4a', icon: 'heart-pulse', type: 'expense', isSystem: true },
  { id: 21, name: 'Teléfono', color: '#c4621d', icon: 'globe', type: 'expense', isSystem: true },
  { id: 22, name: 'Iglesia', color: '#b8923a', icon: 'shield', type: 'expense', isSystem: true },
  { id: 23, name: 'Vivienda', color: '#8a6a4a', icon: 'home', type: 'expense', isSystem: true },
  { id: 24, name: 'Mercado', color: '#2d4a3e', icon: 'shopping-cart', type: 'expense', isSystem: true },
  { id: 25, name: 'Prestamo', color: '#6b7280', icon: 'arrow-right-left', type: 'expense', isSystem: true },
  { id: 26, name: 'Perdida', color: '#a83e2b', icon: 'more-horizontal', type: 'expense', isSystem: true },
  { id: 27, name: 'Adelanto', color: '#2d4a3e', icon: 'plus-circle', type: 'income', isSystem: true },
  { id: 28, name: 'Cobro Deuda', color: '#2d4a3e', icon: 'arrow-right-left', type: 'income', isSystem: true },
]

// IDs: 1–23 original, 24=Mercado, 25=Prestamo, 26=Perdida, 27=Adelanto, 28=Cobro Deuda

const DEFAULT_SETTINGS: AppSettings = {
  baseCurrency: 'USD',
  secondaryCurrency: 'COP',
  displayName: 'Usuario',
  titheConfig: {
    tithePercentByIncomeCategory: {
      13: { tithe: 10, offering: 10 },
      14: { tithe: 10, offering: 5 },
      27: { tithe: 10, offering: 5 },
    },
    defaultTithe: 10,
    defaultOffering: 10,
    destination: 'Iglesia Adventista',
  },
  taxProfile: {
    residentStatus: 'resident',
    regime: 'simple',
    activityCode: '',
    isVATResponsible: false,
    validatedByAccountant: false,
  },
  ocrProvider: 'claude',
  autoCategorize: true,
  monthlyTaxProvisionRate: 0.02,
  availableCapitalAmount: 0,
  availableCapitalCurrency: 'COP',
  titheCarryoverUsd: 0,
  titheStartDate: '2026-05-03',
}

const SEED_FLAG_KEY = '__seedVersion'
const SEED_VERSION = 11

export async function ensureSeed(): Promise<void> {
  const existing = await db.settings.get(SEED_FLAG_KEY)
  if (existing && (existing.value as number) >= SEED_VERSION) return

  console.log(`[seed] Running seed v${SEED_VERSION}...`)

  try {
    await db.transaction(
      'rw',
      [
        db.categories,
        db.settings,
        db.transactions,
        db.invoices,
        db.invoiceItems,
        db.debts,
        db.goals,
        db.trmRecords,
        db.forexRates,
        db.auditLog,
        db.tithePayments,
        db.attachments,
        db.exchangeOps,
      ],
      async () => {
        await db.categories.clear()
        await db.transactions.clear()
        await db.invoices.clear()
        await db.invoiceItems.clear()
        await db.debts.clear()
        await db.goals.clear()
        await db.auditLog.clear()
        await db.tithePayments.clear()
        await db.trmRecords.clear()
        await db.forexRates.clear()
        await db.attachments.clear()
        await db.exchangeOps.clear()
        await db.settings.clear()

        await db.categories.bulkAdd(DEFAULT_CATEGORIES)

        for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
          await db.settings.put({ key, value })
        }

        await db.settings.put({ key: SEED_FLAG_KEY, value: SEED_VERSION })
      },
    )
    console.log(`[seed] Seed v${SEED_VERSION} completed successfully`)
  } catch (err) {
    console.error(`[seed] Seed v${SEED_VERSION} FAILED:`, err)
    throw err
  }
}

/** Call from browser console to force a full re-seed. */
export async function forceReseed(): Promise<void> {
  await db.settings.delete(SEED_FLAG_KEY)
  await ensureSeed()
}

// Expose on window for console access
if (typeof window !== 'undefined') {
  ;(window as unknown as Record<string, unknown>).forceReseed = forceReseed
}
