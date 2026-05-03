import { useLiveQuery } from 'dexie-react-hooks'
import { toast } from 'sonner'
import { db } from '@/db/schema'
import { getEquivalentAmounts } from '@/lib/currency'
import type { Currency, DebtType } from '@/types/domain'

export interface DebtFormData {
  name: string
  creditor: string
  type: DebtType
  originalAmount: number
  currentBalance: number
  currency: Currency
  interestRate: number
  monthlyPayment: number
  totalInstallments: number
  paidInstallments: number
  nextPaymentDate: string
  notes?: string
}

export interface DebtPaymentData {
  amount: number
  capitalAmount: number
  interestAmount: number
  date: string
}

export function useDebts(rates: { trm: number; eurToUsd: number }) {
  const debts = useLiveQuery(() => db.debts.toArray())

  async function addDebt(data: DebtFormData) {
    await db.debts.add({
      ...data,
      createdAt: new Date().toISOString(),
    })
    toast.success('Deuda registrada')
  }

  async function updateDebt(id: number, data: Partial<DebtFormData>) {
    await db.debts.update(id, data)
    toast.success('Deuda actualizada')
  }

  async function deleteDebt(id: number) {
    await db.debts.delete(id)
    toast.success('Deuda eliminada')
  }

  async function registerPayment(id: number, data: DebtPaymentData) {
    const debt = await db.debts.get(id)
    if (!debt) return

    const now = new Date().toISOString()

    await db.transaction('rw', [db.debts, db.transactions], async () => {
      const { amountInBase, amountInSecondary } = getEquivalentAmounts(data.amount, debt.currency, rates)
      const debtCategory = await db.categories.filter(c => c.name === 'Deuda').first()

      await db.transactions.add({
        date: data.date,
        type: 'debt_payment',
        concept: `Cuota · ${debt.name}`,
        categoryId: debtCategory?.id ?? 10,
        amount: data.amount,
        currency: debt.currency,
        trm: rates.trm,
        amountInBase,
        amountInSecondary,
        debtId: id,
        capitalAmount: data.capitalAmount,
        interestAmount: data.interestAmount,
        createdAt: now,
        updatedAt: now,
      })

      const newBalance = Math.max(0, debt.currentBalance - data.capitalAmount)
      const updates: Partial<import('@/types/domain').Debt> = {
        currentBalance: newBalance,
        paidInstallments: debt.paidInstallments + 1,
      }
      if (newBalance <= 0) updates.isPaid = true
      await db.debts.update(id, updates)

      if (newBalance <= 0) {
        toast.success(`¡Has saldado "${debt.name}"!`)
      } else {
        toast.success('Pago registrado')
      }
    })
  }

  return {
    debts: debts ?? [],
    loading: debts === undefined,
    addDebt,
    updateDebt,
    deleteDebt,
    registerPayment,
  }
}
