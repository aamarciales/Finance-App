import { db } from './schema'
import type { AppSettings, Category } from '@/types/domain'

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
]

const DEFAULT_SETTINGS: AppSettings = {
  baseCurrency: 'USD',
  secondaryCurrency: 'COP',
  displayName: 'Andrés',
  titheConfig: {
    freelanceTithe: 10,
    freelanceOffering: 10,
    salaryTithe: 10,
    salaryOffering: 5,
    destination: 'Iglesia local',
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
}

const SEED_FLAG_KEY = '__seedVersion'
const SEED_VERSION = 1

export async function ensureSeed(): Promise<void> {
  const existing = await db.settings.get(SEED_FLAG_KEY)
  if (existing && (existing.value as number) >= SEED_VERSION) return

  await db.transaction('rw', db.categories, db.settings, async () => {
    const categoryCount = await db.categories.count()
    if (categoryCount === 0) {
      await db.categories.bulkAdd(DEFAULT_CATEGORIES)
    }

    /* Settings: una entrada por cada key del AppSettings */
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      const current = await db.settings.get(key)
      if (!current) {
        await db.settings.put({ key, value })
      }
    }

    await db.settings.put({ key: SEED_FLAG_KEY, value: SEED_VERSION })
  })
}
