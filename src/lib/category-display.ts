/** English labels for system categories stored with Spanish names in existing databases. */
const DISPLAY_NAMES: Record<string, string> = {
  Supermercado: 'Groceries',
  'Comida fuera': 'Dining out',
  Vivienda: 'Housing',
  Servicios: 'Utilities',
  Suscripciones: 'Subscriptions',
  Transporte: 'Transport',
  Salud: 'Health',
  Educación: 'Education',
  Hogar: 'Home',
  'Cuidado personal': 'Personal care',
  'Diezmo y Ofrenda': 'Tithe & offerings',
  Diezmo: 'Tithe',
  Ofrendas: 'Offerings',
  Ofrenda: 'Offering',
  Deuda: 'Debt',
  Impuestos: 'Taxes',
  'Comisiones bancarias': 'Bank fees',
  Mascotas: 'Pets',
  Otros: 'Other',
  Sueldo: 'Salary',
  Freelance: 'Freelance',
  Adelanto: 'Advance',
  'Cobro deuda': 'Debt collection',
  'Otros ingresos': 'Other income',
  Transferencias: 'Transfers',
}

export function displayCategoryName(name: string): string {
  return DISPLAY_NAMES[name] ?? name
}

/** Legacy trakll-sync rows may still store Spanish "Factura …" concepts. */
export function displayTransactionConcept(concept: string): string {
  return concept.replace(/^Factura\b/i, 'Invoice')
}

/** Category names used for tithe-related logic (Spanish + English seeds). */
export const TITHE_CATEGORY_NAMES = new Set([
  'Diezmo',
  'Diezmo y Ofrenda',
  'Ofrendas',
  'Ofrenda',
  'Tithe',
  'Tithe & offerings',
  'Offerings',
  'Offering',
])

export const DEBT_CATEGORY_NAMES = new Set(['Deuda', 'Debt'])

export function isTitheCategory(name: string): boolean {
  return TITHE_CATEGORY_NAMES.has(name)
}

export function isDebtCategory(name: string): boolean {
  return DEBT_CATEGORY_NAMES.has(name)
}
