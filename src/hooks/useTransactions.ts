import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { toast } from 'sonner'
import { db } from '@/db/schema'
import { getEquivalentAmounts } from '@/lib/currency'
import type { Category, Transaction } from '@/types/domain'

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

/** Whether a transaction counts toward income/expense KPIs. Transfers are excluded. */
export function isKpiTransaction(tx: Transaction): boolean {
  return tx.type !== 'transfer'
}

export function useTransactions(filters: TxFilters = {}, rates: { trm: number; eurToUsd: number }) {
  const { tab, periodStart, periodEnd, categoryId, search } = filters

  const transactions = useLiveQuery(async () => {
    const all = await db.transactions.orderBy('date').reverse().toArray()
    return all.filter((tx) => {
      if (tab === 'income' && tx.type !== 'income') return false
      if (tab === 'expense' && tx.type !== 'expense' && tx.type !== 'debt_payment') return false
      if (tab === 'recurring' && !tx.isRecurring) return false
      if (periodStart && tx.date < periodStart) return false
      if (periodEnd && tx.date > periodEnd) return false
      if (categoryId && tx.categoryId !== categoryId) return false
      if (search && !tx.concept.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [tab, periodStart, periodEnd, categoryId, search])

  const categories = useLiveQuery(() => db.categories.toArray()) ?? []

  const categoryMap = useMemo(() => {
    const m = new Map<number, Category>()
    for (const c of categories) {
      if (c.id != null) m.set(c.id, c)
    }
    return m
  }, [categories])

  const enriched: EnrichedTransaction[] = useMemo(() => {
    if (!transactions) return []
    return transactions.map((tx) => ({
      ...tx,
      category: categoryMap.get(tx.categoryId)!,
    })).filter((tx) => tx.category)
  }, [transactions, categoryMap])

  const addTx = useMemo(() => async (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'amountInBase' | 'amountInSecondary'>) => {
    const { amountInBase, amountInSecondary } = getEquivalentAmounts(data.amount, data.currency, rates)
    const now = new Date().toISOString()

    if (data.type === 'debt_payment' && data.debtId) {
      await db.transaction('rw', [db.transactions, db.debts], async () => {
        const txId = await db.transactions.add({ ...data, amountInBase, amountInSecondary, createdAt: now, updatedAt: now })

        const debt = await db.debts.get(data.debtId!)
        if (debt) {
          const capital = data.capitalAmount ?? data.amount
          const newBalance = Math.max(0, debt.currentBalance - capital)
          const updates: Partial<typeof debt> = {
            currentBalance: newBalance,
            paidInstallments: debt.paidInstallments + 1,
          }
          if (newBalance <= 0) {
            updates.isPaid = true
          }
          await db.debts.update(data.debtId!, updates)

          if (newBalance <= 0) {
            toast.success(`Has saldado "${debt.name}"`)
          }
        }

        // If interest was specified, create a separate expense tx
        if (data.interestAmount && data.interestAmount > 0) {
          const interestCategory = await db.categories.filter((c) => c.name === 'Intereses bancarios').first()
          if (interestCategory?.id) {
            const { amountInBase: ib, amountInSecondary: is2 } = getEquivalentAmounts(data.interestAmount, data.currency, rates)
            await db.transactions.add({
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
              createdAt: now,
              updatedAt: now,
            })
          }
        }

        return txId
      })
    } else {
      return db.transactions.add({ ...data, amountInBase, amountInSecondary, createdAt: now, updatedAt: now })
    }
  }, [rates])

  const updateTx = useMemo(() => async (id: number, data: Partial<Omit<Transaction, 'id' | 'createdAt'>>) => {
    const update: Partial<Transaction> = { ...data, updatedAt: new Date().toISOString() }

    // Handle debt payment reversal + reapplication
    if (data.type === 'debt_payment' || (data.debtId !== undefined)) {
      const oldTx = await db.transactions.get(id)
      if (oldTx?.type === 'debt_payment' && oldTx.debtId) {
        await db.transaction('rw', [db.transactions, db.debts], async () => {
          // Reverse old delta
          const oldDebt = await db.debts.get(oldTx.debtId!)
          if (oldDebt) {
            const oldCapital = oldTx.capitalAmount ?? oldTx.amount
            await db.debts.update(oldTx.debtId!, {
              currentBalance: oldDebt.currentBalance + oldCapital,
              paidInstallments: Math.max(0, oldDebt.paidInstallments - 1),
              isPaid: false,
            })
          }

          // Apply new tx
          if (data.amount !== undefined || data.currency !== undefined) {
            const amount = data.amount ?? oldTx.amount
            const currency = data.currency ?? oldTx.currency
            const equiv = getEquivalentAmounts(amount, currency, rates)
            Object.assign(update, { amountInBase: equiv.amountInBase, amountInSecondary: equiv.amountInSecondary })
          }
          await db.transactions.update(id, update)

          // Apply new delta
          const newDebtId = data.debtId ?? oldTx.debtId
          if (newDebtId) {
            const newDebt = await db.debts.get(newDebtId)
            if (newDebt) {
              const newCapital = data.capitalAmount ?? data.amount ?? oldTx.amount
              const newBalance = Math.max(0, newDebt.currentBalance - newCapital)
              const updates: Partial<typeof newDebt> = {
                currentBalance: newBalance,
                paidInstallments: newDebt.paidInstallments + 1,
              }
              if (newBalance <= 0) updates.isPaid = true
              await db.debts.update(newDebtId, updates)
              if (newBalance <= 0) toast.success(`Has saldado "${newDebt.name}"`)
            }
          }
        })
        return
      }
    }

    if (data.amount !== undefined || data.currency !== undefined) {
      const tx = await db.transactions.get(id)
      const amount = data.amount ?? tx!.amount
      const currency = data.currency ?? tx!.currency
      const equiv = getEquivalentAmounts(amount, currency, rates)
      return db.transactions.update(id, { ...update, amountInBase: equiv.amountInBase, amountInSecondary: equiv.amountInSecondary })
    }
    return db.transactions.update(id, update)
  }, [rates])

  const deleteTx = useMemo(() => async (id: number) => {
    const tx = await db.transactions.get(id)
    if (tx?.type === 'debt_payment' && tx.debtId) {
      await db.transaction('rw', [db.transactions, db.debts], async () => {
        await db.transactions.delete(id)
        const debt = await db.debts.get(tx.debtId!)
        if (debt) {
          const capital = tx.capitalAmount ?? tx.amount
          await db.debts.update(tx.debtId!, {
            currentBalance: debt.currentBalance + capital,
            paidInstallments: Math.max(0, debt.paidInstallments - 1),
            isPaid: false,
          })
        }
      })
    } else {
      await db.transactions.delete(id)
    }
  }, [])

  return {
    transactions: enriched,
    categories,
    loading: transactions === undefined,
    addTransaction: addTx,
    updateTransaction: updateTx,
    deleteTransaction: deleteTx,
  }
}

export function sumBaseCurrency(txs: Transaction[]): number {
  return txs.filter(isKpiTransaction).reduce((sum, tx) => sum + tx.amountInBase, 0)
}
