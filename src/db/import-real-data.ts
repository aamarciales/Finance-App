import { db } from './schema'
import { getEquivalentAmounts } from '@/lib/currency'
import type { Currency, TxType } from '@/types/domain'

const EUR_RATE = 1.08

interface HardcodedTx {
  date: string
  type: TxType
  concept: string
  categoryId: number
  amount: number
  currency: Currency
  trm: number
  debtId?: number
}

const TXS: HardcodedTx[] = [
  // ── INGRESOS ──────────────────────────────────────────
  { date: '2026-04-09', type: 'income', concept: 'Adelanto BRIX Agency', categoryId: 27, amount: 100, currency: 'USD', trm: 3619 },
  { date: '2026-04-13', type: 'income', concept: 'Pago Eventive Global · Parte 1', categoryId: 13, amount: 250, currency: 'USD', trm: 3514.27 },
  { date: '2026-04-14', type: 'income', concept: 'Pago Eventive Global · Parte 2', categoryId: 13, amount: 250, currency: 'USD', trm: 3556.99 },
  { date: '2026-04-15', type: 'income', concept: 'Sueldo quincenal BRIX Agency', categoryId: 14, amount: 400, currency: 'USD', trm: 3576.50 },
  { date: '2026-04-28', type: 'income', concept: 'Pago adicional Eventive Global', categoryId: 13, amount: 100, currency: 'USD', trm: 3576.79 },
  { date: '2026-04-28', type: 'income', concept: 'Pago deuda Jhonatan', categoryId: 28, amount: 20000, currency: 'COP', trm: 3576.79 },
  { date: '2026-04-29', type: 'income', concept: 'Ingreso de Horacio', categoryId: 15, amount: 35262, currency: 'COP', trm: 3576.79 },
  { date: '2026-04-30', type: 'income', concept: 'Sueldo quincenal BRIX Agency', categoryId: 14, amount: 500, currency: 'USD', trm: 3624.02 },
  { date: '2026-05-01', type: 'income', concept: 'Pago adicional Eventive Global', categoryId: 13, amount: 100, currency: 'USD', trm: 3625.49 },

  // ── SUSCRIPCIONES ─────────────────────────────────────
  { date: '2026-04-15', type: 'expense', concept: 'Suscripción Claude.AI', categoryId: 19, amount: 20, currency: 'USD', trm: 3576.50 },
  { date: '2026-04-18', type: 'expense', concept: 'Suscripción Spotify', categoryId: 19, amount: 18500, currency: 'COP', trm: 3576.50 },
  { date: '2026-04-23', type: 'expense', concept: 'Suscripción 1Password', categoryId: 19, amount: 7.99, currency: 'USD', trm: 3576.50 },
  { date: '2026-04-29', type: 'expense', concept: 'Suscripción HBO Max', categoryId: 19, amount: 12000, currency: 'COP', trm: 3576.50 },
  { date: '2026-04-30', type: 'expense', concept: 'Suscripción Microsoft OneDrive', categoryId: 19, amount: 45999, currency: 'COP', trm: 3624.02 },
  { date: '2026-05-01', type: 'expense', concept: 'Suscripción Toggl', categoryId: 19, amount: 36375.10, currency: 'COP', trm: 3625.49 },
  { date: '2026-05-01', type: 'expense', concept: 'Suscripción Google Workspace', categoryId: 19, amount: 34884, currency: 'COP', trm: 3625.49 },
  { date: '2026-05-02', type: 'expense', concept: 'Cargo adicional Google Workspace', categoryId: 19, amount: 2258, currency: 'COP', trm: 3625.49 },

  // ── DEUDAS ────────────────────────────────────────────
  { date: '2026-04-15', type: 'debt_payment', concept: 'Pago parcial deuda Tío Bairon', categoryId: 10, amount: 225, currency: 'USD', trm: 3576.50, debtId: 1 },
  { date: '2026-04-17', type: 'expense', concept: 'Préstamo a Jhonatan', categoryId: 25, amount: 20000, currency: 'COP', trm: 3576.50 },
  { date: '2026-04-28', type: 'debt_payment', concept: 'Cuota teléfono Motorola Edge Fusion', categoryId: 21, amount: 131000, currency: 'COP', trm: 3576.79, debtId: 2 },
  { date: '2026-04-28', type: 'expense', concept: 'Dinero perdido en la calle', categoryId: 26, amount: 30000, currency: 'COP', trm: 3576.79 },

  // ── VIVIENDA ──────────────────────────────────────────
  { date: '2026-05-01', type: 'expense', concept: 'Pago alquiler casa', categoryId: 23, amount: 1000000, currency: 'COP', trm: 3625.49 },

  // ── TRANSFERENCIA ─────────────────────────────────────
  { date: '2026-05-01', type: 'expense', concept: 'Transferencia a papá', categoryId: 16, amount: 12000, currency: 'COP', trm: 3625.49 },

  // ── IGLESIA (YA DEVUELTO) ─────────────────────────────
  { date: '2026-05-02', type: 'expense', concept: 'Diezmo Iglesia Adventista', categoryId: 8, amount: 252614, currency: 'COP', trm: 3625.49 },
  { date: '2026-05-02', type: 'expense', concept: 'Ofrenda Iglesia Adventista', categoryId: 9, amount: 162395, currency: 'COP', trm: 3625.49 },

  // ── MASCOTAS ──────────────────────────────────────────
  { date: '2026-04-06', type: 'expense', concept: 'Alim. Sec. Mirringo gato 500g', categoryId: 20, amount: 6250, currency: 'COP', trm: 3619 },

  // ── MERCADO ───────────────────────────────────────────
  { date: '2026-04-06', type: 'expense', concept: 'Maiz Pira MXM 500g', categoryId: 24, amount: 2000, currency: 'COP', trm: 3619 },
  { date: '2026-04-12', type: 'expense', concept: 'Azucar MXM Blanca 1000g', categoryId: 24, amount: 3950, currency: 'COP', trm: 3514.27 },
  { date: '2026-04-13', type: 'expense', concept: 'Compra Mas x Menos · 19 ítems', categoryId: 24, amount: 159600, currency: 'COP', trm: 3514.27 },
  { date: '2026-04-15', type: 'expense', concept: 'Compra Mas x Menos · 24 ítems', categoryId: 24, amount: 198354.80, currency: 'COP', trm: 3576.50 },
  { date: '2026-04-18', type: 'expense', concept: 'Compra Mas x Menos · 5 ítems', categoryId: 24, amount: 34580, currency: 'COP', trm: 3576.50 },
  { date: '2026-04-20', type: 'expense', concept: 'Compra Mas x Menos · 6 ítems', categoryId: 24, amount: 59350, currency: 'COP', trm: 3576.50 },
  { date: '2026-04-23', type: 'expense', concept: 'Compra Mas x Menos · Cereal + Leche', categoryId: 24, amount: 22000, currency: 'COP', trm: 3576.50 },
  { date: '2026-04-24', type: 'expense', concept: 'Compra D1', categoryId: 24, amount: 1350, currency: 'COP', trm: 3576.50 },
  { date: '2026-04-26', type: 'expense', concept: 'Gaseosa Coca-Cola 1500ml', categoryId: 24, amount: 6800, currency: 'COP', trm: 3576.50 },
  { date: '2026-04-27', type: 'expense', concept: 'Adaptador de corriente', categoryId: 7, amount: 3500, currency: 'COP', trm: 3576.50 },
  { date: '2026-04-28', type: 'expense', concept: 'Mercado general', categoryId: 24, amount: 46430, currency: 'COP', trm: 3576.79 },
  { date: '2026-04-28', type: 'expense', concept: 'Compra queso', categoryId: 24, amount: 18000, currency: 'COP', trm: 3576.79 },
  { date: '2026-04-28', type: 'expense', concept: 'Compra pan', categoryId: 24, amount: 8000, currency: 'COP', trm: 3576.79 },
  { date: '2026-04-28', type: 'expense', concept: 'Compra obleas', categoryId: 24, amount: 42600, currency: 'COP', trm: 3576.79 },
  { date: '2026-04-29', type: 'expense', concept: 'Compra Mas x Menos · Hartón + Carne', categoryId: 24, amount: 44208.30, currency: 'COP', trm: 3576.79 },
  { date: '2026-04-30', type: 'expense', concept: 'Compra aguacate', categoryId: 24, amount: 5000, currency: 'COP', trm: 3624.02 },
  { date: '2026-04-30', type: 'expense', concept: 'Compra tomates', categoryId: 24, amount: 8550, currency: 'COP', trm: 3624.02 },
  { date: '2026-04-30', type: 'expense', concept: 'Gaseosa Coca-Cola 2500ml', categoryId: 24, amount: 8800, currency: 'COP', trm: 3624.02 },
  { date: '2026-05-01', type: 'expense', concept: 'Compra Mas x Menos · 20 ítems', categoryId: 24, amount: 176676, currency: 'COP', trm: 3625.49 },
]

export async function importRealData(): Promise<void> {
  console.log('[import] Starting hardcoded data import...')

  // Debts: [0]=Tío Bairon, [1]=Motorola, [2]=Nu Bank
  const debtIds = await createDebts()
  console.log(`[import] Created ${debtIds.length} debts`)

  // Resolve debtId references (1→debtIds[0], 2→debtIds[1], etc.)
  let txCount = 0
  for (const tx of TXS) {
    const debtId = tx.debtId != null ? debtIds[tx.debtId - 1] : undefined
    const rates = { trm: tx.trm, eurToUsd: EUR_RATE }
    const { amountInBase, amountInSecondary } = getEquivalentAmounts(tx.amount, tx.currency, rates)

    await db.transactions.add({
      date: tx.date,
      type: tx.type,
      concept: tx.concept,
      categoryId: tx.categoryId,
      amount: tx.amount,
      currency: tx.currency,
      trm: tx.trm,
      amountInBase,
      amountInSecondary,
      debtId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    txCount++
  }
  console.log(`[import] Created ${txCount} transactions`)

  // Goals
  await db.goals.bulkAdd([
    {
      name: 'Fondo de emergencia',
      description: '6 meses de gastos básicos',
      iconKey: 'shield',
      color: '#2d4a3e',
      targetAmount: 12000,
      currentAmount: 2800,
      currency: 'USD',
      monthlyContribution: 500,
      targetDate: '2027-06-01',
      createdAt: new Date().toISOString(),
    },
    {
      name: 'MacBook Pro M4',
      description: 'Reemplazo del equipo actual',
      iconKey: 'laptop',
      color: '#7a4a6e',
      targetAmount: 3500,
      currentAmount: 800,
      currency: 'USD',
      monthlyContribution: 300,
      targetDate: '2027-03-01',
      createdAt: new Date().toISOString(),
    },
  ])

  // TRM + Forex cache
  const today = new Date().toISOString().slice(0, 10)
  await db.trmRecords.put({
    date: today,
    rate: 3625.49,
    source: 'manual',
    fetchedAt: new Date().toISOString(),
  })
  await db.forexRates.put({
    pair: 'EUR-USD',
    date: today,
    rate: EUR_RATE,
    source: 'manual',
    fetchedAt: new Date().toISOString(),
  })

  console.log(`[import] Done. ${txCount} transactions, ${debtIds.length} debts, 2 goals`)
}

async function createDebts(): Promise<number[]> {
  const ids: number[] = []
  const debts = [
    {
      name: 'Préstamo Tío Bairon',
      creditor: 'Tío Bairon',
      type: 'family_loan' as const,
      originalAmount: 700,
      currentBalance: 475,
      currency: 'USD' as const,
      interestRate: 0,
      monthlyPayment: 100,
      totalInstallments: 7,
      paidInstallments: 2,
      nextPaymentDate: '2026-06-01',
      notes: 'Préstamo sin intereses. Original 700 USD, pagado 225 USD.',
      createdAt: new Date().toISOString(),
    },
    {
      name: 'Teléfono Motorola Edge Fusion',
      creditor: 'Banco Gana',
      type: 'personal_loan' as const,
      originalAmount: 800000,
      currentBalance: 421586.35,
      currency: 'COP' as const,
      interestRate: 18.5,
      monthlyPayment: 131000,
      totalInstallments: 7,
      paidInstallments: 3,
      nextPaymentDate: '2026-05-12',
      notes: 'Cuota mensual con intereses',
      createdAt: new Date().toISOString(),
    },
    {
      name: 'Tarjeta Nu Bank',
      creditor: 'Nu Bank',
      type: 'credit_card' as const,
      originalAmount: 1500000,
      currentBalance: 1011537.62,
      currency: 'COP' as const,
      interestRate: 24.8,
      monthlyPayment: 732293.16,
      totalInstallments: 3,
      paidInstallments: 1,
      nextPaymentDate: '2026-05-19',
      notes: 'Pago mínimo mensual',
      createdAt: new Date().toISOString(),
    },
  ]

  for (const debt of debts) {
    ids.push((await db.debts.add(debt)) as number)
  }
  return ids
}
