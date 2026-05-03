import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useApi } from '@/lib/api'
import { getEquivalentAmounts } from '@/lib/currency'
import type { Currency, DebtType, Debt, Category } from '@/types/domain'

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
  const api = useApi()
  const queryClient = useQueryClient()

  const { data: debts, isLoading: loadingDebts } = useQuery({
    queryKey: ['debts'],
    queryFn: () => api.get<Debt[]>('/debts'),
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/categories'),
  })

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['debts'] })
    queryClient.invalidateQueries({ queryKey: ['transactions'] })
  }

  const { mutateAsync: addDebtMutate } = useMutation({
    mutationFn: async (data: DebtFormData) => {
      await api.post('/debts', data)
    },
    onSuccess: () => {
      invalidateAll()
      toast.success('Deuda registrada')
    }
  })

  const { mutateAsync: updateDebtMutate } = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<DebtFormData> }) => {
      await api.put(`/debts/${id}`, data)
    },
    onSuccess: () => {
      invalidateAll()
      toast.success('Deuda actualizada')
    }
  })

  const { mutateAsync: deleteDebtMutate } = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/debts/${id}`)
    },
    onSuccess: () => {
      invalidateAll()
      toast.success('Deuda eliminada')
    }
  })

  const { mutateAsync: registerPaymentMutate } = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: DebtPaymentData }) => {
      const debt = debts?.find(d => d.id === id)
      if (!debt) return

      const { amountInBase, amountInSecondary } = getEquivalentAmounts(data.amount, debt.currency, rates)
      const debtCategory = categories?.find(c => c.name === 'Deuda')

      await api.post('/transactions', {
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
      })

      const newBalance = Math.max(0, debt.currentBalance - data.capitalAmount)
      const updates: Partial<Debt> = {
        currentBalance: newBalance,
        paidInstallments: debt.paidInstallments + 1,
        isPaid: newBalance <= 0
      }
      await api.put(`/debts/${id}`, updates)
      
      return { debtName: debt.name, newBalance }
    },
    onSuccess: (result) => {
      if (!result) return
      invalidateAll()
      if (result.newBalance <= 0) {
        toast.success(`¡Has saldado "${result.debtName}"!`)
      } else {
        toast.success('Pago registrado')
      }
    }
  })

  return {
    debts: debts ?? [],
    loading: loadingDebts,
    addDebt: async (data: DebtFormData) => addDebtMutate(data),
    updateDebt: async (id: number, data: Partial<DebtFormData>) => updateDebtMutate({ id, data }),
    deleteDebt: async (id: number) => deleteDebtMutate(id),
    registerPayment: async (id: number, data: DebtPaymentData) => {
      await registerPaymentMutate({ id, data })
    },
  }
}
