import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useApi } from '@/lib/api'
import { getEquivalentAmounts } from '@/lib/currency'
import type { Category, Transaction, Debt } from '@/types/domain'

export type TabFilter = 'all' | 'income' | 'expense' | 'recurring'

export interface TxFilters {
  tab?: TabFilter
  periodStart?: string
  periodEnd?: string
  categoryId?: number
  search?: string
}

export interface EnrichedTransaction extends Transaction {
  category: Category
}

export function isKpiTransaction(tx: Transaction): boolean {
  return tx.type !== 'transfer'
}

export function useTransactions(filters: TxFilters = {}, rates: { trm: number; eurToUsd: number }) {
  const { tab, periodStart, periodEnd, categoryId, search } = filters
  const api = useApi()
  const queryClient = useQueryClient()

  const { data: rawTransactions, isLoading: loadingTxs } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => api.get<Transaction[]>('/transactions'),
  })

  const { data: categories, isLoading: loadingCats } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/categories'),
  })

  const { data: debts } = useQuery({
    queryKey: ['debts'],
    queryFn: () => api.get<Debt[]>('/debts'),
  })

  const filteredTransactions = useMemo(() => {
    if (!rawTransactions) return []
    return rawTransactions.filter((tx) => {
      if (tab === 'income' && tx.type !== 'income') return false
      if (tab === 'expense' && tx.type !== 'expense' && tx.type !== 'debt_payment') return false
      if (tab === 'recurring' && !tx.isRecurring) return false
      if (periodStart && tx.date < periodStart) return false
      if (periodEnd && tx.date > periodEnd) return false
      if (categoryId && tx.categoryId !== categoryId) return false
      if (search && !tx.concept.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [rawTransactions, tab, periodStart, periodEnd, categoryId, search])

  const categoryMap = useMemo(() => {
    const m = new Map<number, Category>()
    if (categories) {
      for (const c of categories) {
        if (c.id != null) m.set(c.id, c)
      }
    }
    return m
  }, [categories])

  const enriched: EnrichedTransaction[] = useMemo(() => {
    return filteredTransactions.map((tx) => ({
      ...tx,
      category: categoryMap.get(tx.categoryId)!,
    })).filter((tx) => tx.category)
  }, [filteredTransactions, categoryMap])

  // Mutations
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] })
    queryClient.invalidateQueries({ queryKey: ['debts'] })
  }

  const { mutateAsync: addTxMutate } = useMutation({
    mutationFn: async (data: any) => {
      // Create transaction
      const tx = await api.post<Transaction>('/transactions', data)

      // Debt logic
      if (data.type === 'debt_payment' && data.debtId && debts) {
        const debt = debts.find(d => d.id === data.debtId)
        if (debt) {
          const capital = data.capitalAmount ?? data.amount
          const newBalance = Math.max(0, debt.currentBalance - capital)
          await api.put(`/debts/${debt.id}`, {
            currentBalance: newBalance,
            paidInstallments: debt.paidInstallments + 1,
            isPaid: newBalance <= 0
          })
          if (newBalance <= 0) toast.success(`Has saldado "${debt.name}"`)
        }

        // Interest logic -> create another expense tx
        if (data.interestAmount && data.interestAmount > 0) {
          const interestCategory = categories?.find(c => c.name === 'Intereses bancarios')
          if (interestCategory?.id) {
            const { amountInBase: ib, amountInSecondary: is2 } = getEquivalentAmounts(data.interestAmount, data.currency, rates)
            await api.post('/transactions', {
              date: data.date,
              type: 'expense',
              concept: `Intereses · ${data.concept}`,
              categoryId: interestCategory.id,
              amount: data.interestAmount,
              currency: data.currency,
              trm: data.trm,
              amountInBase: ib,
              amountInSecondary: is2,
              debtId: data.debtId,
            })
          }
        }
      }
      return tx
    },
    onSuccess: invalidateAll
  })

  const { mutateAsync: updateTxMutate } = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const oldTx = rawTransactions?.find(t => t.id === id)
      
      // Debt reversal logic
      if ((data.type === 'debt_payment' || data.debtId !== undefined) && oldTx?.type === 'debt_payment' && oldTx.debtId && debts) {
        const oldDebt = debts.find(d => d.id === oldTx.debtId)
        if (oldDebt) {
          const oldCapital = oldTx.capitalAmount ?? oldTx.amount
          await api.put(`/debts/${oldDebt.id}`, {
            currentBalance: oldDebt.currentBalance + oldCapital,
            paidInstallments: Math.max(0, oldDebt.paidInstallments - 1),
            isPaid: false
          })
        }

        // Re-apply new delta
        const newDebtId = data.debtId ?? oldTx.debtId
        if (newDebtId) {
          // Wait to fetch updated debt if it's the same, or just use calculation
          const targetDebt = newDebtId === oldTx.debtId && oldDebt 
             ? { ...oldDebt, currentBalance: oldDebt.currentBalance + (oldTx.capitalAmount ?? oldTx.amount), paidInstallments: Math.max(0, oldDebt.paidInstallments - 1) } 
             : debts.find(d => d.id === newDebtId)

          if (targetDebt) {
            const newCapital = data.capitalAmount ?? data.amount ?? oldTx.amount
            const newBalance = Math.max(0, targetDebt.currentBalance - newCapital)
            await api.put(`/debts/${newDebtId}`, {
              currentBalance: newBalance,
              paidInstallments: targetDebt.paidInstallments + 1,
              isPaid: newBalance <= 0
            })
            if (newBalance <= 0) toast.success(`Has saldado "${targetDebt.name}"`)
          }
        }
      }

      await api.put(`/transactions/${id}`, data)
    },
    onSuccess: invalidateAll
  })

  const { mutateAsync: deleteTxMutate } = useMutation({
    mutationFn: async (id: number) => {
      const tx = rawTransactions?.find(t => t.id === id)
      if (tx?.type === 'debt_payment' && tx.debtId && debts) {
        const debt = debts.find(d => d.id === tx.debtId)
        if (debt) {
          const capital = tx.capitalAmount ?? tx.amount
          await api.put(`/debts/${debt.id}`, {
            currentBalance: debt.currentBalance + capital,
            paidInstallments: Math.max(0, debt.paidInstallments - 1),
            isPaid: false
          })
        }
      }
      await api.delete(`/transactions/${id}`)
    },
    onSuccess: invalidateAll
  })

  const addTransaction = async (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'amountInBase' | 'amountInSecondary'>) => {
    const { amountInBase, amountInSecondary } = getEquivalentAmounts(data.amount, data.currency, rates)
    const tx = await addTxMutate({ ...data, amountInBase, amountInSecondary })
    return tx.id
  }

  const updateTransaction = async (id: number, data: Partial<Omit<Transaction, 'id' | 'createdAt'>>) => {
    const update = { ...data }
    if (data.amount !== undefined || data.currency !== undefined) {
      const tx = rawTransactions?.find(t => t.id === id)
      const amount = data.amount ?? tx?.amount ?? 0
      const currency = data.currency ?? tx?.currency ?? 'COP'
      const equiv = getEquivalentAmounts(amount, currency, rates)
      Object.assign(update, { amountInBase: equiv.amountInBase, amountInSecondary: equiv.amountInSecondary })
    }
    await updateTxMutate({ id, data: update })
  }

  const deleteTransaction = async (id: number) => {
    await deleteTxMutate(id)
  }

  return {
    transactions: enriched,
    categories: categories ?? [],
    loading: loadingTxs || loadingCats,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  }
}

export function sumBaseCurrency(txs: Transaction[]): number {
  return txs.filter(isKpiTransaction).reduce((sum, tx) => sum + tx.amountInBase, 0)
}
