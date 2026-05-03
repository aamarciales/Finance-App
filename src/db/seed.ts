import { db } from './schema'
import type { AppSettings, Category } from '@/types/domain'
import { importRealData } from './import-real-data'

const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Supermercado', color: '#2d4a3e', icon: 'shopping-cart', type: 'expense', isSystem: true },
  { name: 'Comida fuera', color: '#b8923a', icon: 'utensils', type: 'expense', isSystem: true },
  { name: 'Transporte', color: '#c4621d', icon: 'car', type: 'expense', isSystem: true },
  { name: 'Servicios', color: '#5a4ea0', icon: 'globe', type: 'expense', isSystem: true },
  { name: 'Salud', color: '#4a6e8a', icon: 'heart-pulse', type: 'expense', isSystem: true },
  { name: 'Educación', color: '#7a4a6e', icon: 'book-open', type: 'expense', isSystem: true },
  { name: 'Hogar', color: '#8a6a4a', icon: 'home', type: 'expense', isSystem: true },
  { name: 'Diezmo', color: '#b8923a', icon: 'shield', type: 'expense', isSystem: true },
  { name: 'Ofrendas', color: '#d4b974', icon: 'heart', type: 'expense', isSystem: true },
  { name: 'Deuda', color: '#a83e2b', icon: 'credit-card', type: 'expense', isSystem: true },
  { name: 'Impuestos', color: '#4a6e8a', icon: 'file-text', type: 'expense', isSystem: true },
  { name: 'Otros', color: '#9a978d', icon: 'more-horizontal', type: 'expense', isSystem: true },
  { name: 'Freelance', color: '#2d4a3e', icon: 'briefcase', type: 'income', isSystem: true },
  { name: 'Sueldo', color: '#2d4a3e', icon: 'wallet', type: 'income', isSystem: true },
  { name: 'Otros ingresos', color: '#9a978d', icon: 'plus-circle', type: 'income', isSystem: true },
  { name: 'Transferencias', color: '#6b7280', icon: 'arrow-right-left', type: 'expense', isSystem: true },
  { name: 'Comisiones bancarias', color: '#8a6a4a', icon: 'landmark', type: 'expense', isSystem: true },
  { name: 'Intereses bancarios', color: '#b54a3e', icon: 'percent', type: 'expense', isSystem: true },
  { name: 'Suscripciones', color: '#5a4ea0', icon: 'globe', type: 'expense', isSystem: true },
  { name: 'Mascotas', color: '#8a6a4a', icon: 'heart-pulse', type: 'expense', isSystem: true },
  { name: 'Teléfono', color: '#c4621d', icon: 'globe', type: 'expense', isSystem: true },
  { name: 'Iglesia', color: '#b8923a', icon: 'shield', type: 'expense', isSystem: true },
  { name: 'Vivienda', color: '#8a6a4a', icon: 'home', type: 'expense', isSystem: true },
  { name: 'Mercado', color: '#2d4a3e', icon: 'shopping-cart', type: 'expense', isSystem: true },
  { name: 'Prestamo', color: '#6b7280', icon: 'arrow-right-left', type: 'expense', isSystem: true },
  { name: 'Perdida', color: '#a83e2b', icon: 'more-horizontal', type: 'expense', isSystem: true },
  { name: 'Adelanto', color: '#2d4a3e', icon: 'plus-circle', type: 'income', isSystem: true },
  { name: 'Cobro Deuda', color: '#2d4a3e', icon: 'arrow-right-left', type: 'income', isSystem: true },
]

// IDs: 1–23 original, 24=Mercado, 25=Prestamo, 26=Perdida, 27=Adelanto, 28=Cobro Deuda

const DEFAULT_SETTINGS: AppSettings = {
  baseCurrency: 'USD',
  secondaryCurrency: 'COP',
  displayName: 'Andrés',
  titheConfig: {
    tithePercentByIncomeCategory: {
      13: { tithe: 10, offering: 10 },
      14: { tithe: 10, offering: 5 },
      27: { tithe: 10, offering: 5 },
    },
    defaultTithe: 10,
    defaultOffering: 0,
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
  availableCapitalAmount: 154936.68,
  availableCapitalCurrency: 'COP',
  titheCarryoverUsd: 300,
}

const SEED_FLAG_KEY = '__seedVersion'
const SEED_VERSION = 10

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
        db.attachments,
        db.tithePayments,
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

        await importRealData()

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
