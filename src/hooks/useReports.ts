import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/schema'
import type { Category } from '@/types/domain'

export type PeriodType = 'month' | 'quarter' | 'semester' | 'year'

export interface ReportPeriod {
  label: string
  sortKey: string
  income: number
  incomeCop: number
  expense: number
  expenseCop: number
  tithe: number
  titheCop: number
  debt: number
  debtCop: number
  netBalance: number
  netBalanceCop: number
}

export interface ReportsData {
  periods: ReportPeriod[]
  loading: boolean
}

function getQuarter(month: number): number {
  return Math.floor((month - 1) / 3) + 1
}

function getSemester(month: number): number {
  return month <= 6 ? 1 : 2
}

export function useReports(periodType: PeriodType): ReportsData {
  const transactions = useLiveQuery(() => db.transactions.toArray())
  const categories = useLiveQuery(() => db.categories.toArray())

  return useMemo(() => {
    if (!transactions || !categories) {
      return { periods: [], loading: true }
    }

    const categoryMap = new Map<number, Category>()
    for (const c of categories) {
      if (c.id != null) categoryMap.set(c.id, c)
    }

    const titheCatIds = new Set(
      categories.filter(c => c.name === 'Diezmo' || c.name === 'Ofrendas').map(c => c.id)
    )

    const groups = new Map<string, ReportPeriod>()

    for (const tx of transactions) {
      if (tx.type === 'transfer') continue

      // Parse date: YYYY-MM-DD
      const year = tx.date.substring(0, 4)
      const month = parseInt(tx.date.substring(5, 7), 10)
      
      let sortKey = ''
      let label = ''

      switch (periodType) {
        case 'month': {
          const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
          sortKey = `${year}-${month.toString().padStart(2, '0')}`
          label = `${monthNames[month - 1]} ${year}`
          break
        }
        case 'quarter': {
          const q = getQuarter(month)
          sortKey = `${year}-Q${q}`
          label = `Q${q} ${year}`
          break
        }
        case 'semester': {
          const s = getSemester(month)
          sortKey = `${year}-S${s}`
          label = `Semestre ${s} ${year}`
          break
        }
        case 'year': {
          sortKey = `${year}`
          label = `${year}`
          break
        }
      }

      if (!groups.has(sortKey)) {
        groups.set(sortKey, {
          label,
          sortKey,
          income: 0, incomeCop: 0,
          expense: 0, expenseCop: 0,
          tithe: 0, titheCop: 0,
          debt: 0, debtCop: 0,
          netBalance: 0, netBalanceCop: 0,
        })
      }

      const group = groups.get(sortKey)!

      const usd = tx.amountInBase
      const cop = tx.amountInSecondary

      if (tx.type === 'income') {
        group.income += usd
        group.incomeCop += cop
        group.netBalance += usd
        group.netBalanceCop += cop
      } else if (tx.type === 'debt_payment') {
        group.debt += usd
        group.debtCop += cop
        group.netBalance -= usd
        group.netBalanceCop -= cop
      } else if (tx.type === 'expense') {
        if (tx.categoryId != null && titheCatIds.has(tx.categoryId)) {
          group.tithe += usd
          group.titheCop += cop
        } else {
          group.expense += usd
          group.expenseCop += cop
        }
        group.netBalance -= usd
        group.netBalanceCop -= cop
      }
    }

    const periods = Array.from(groups.values()).sort((a, b) => b.sortKey.localeCompare(a.sortKey))

    return { periods, loading: false }
  }, [transactions, categories, periodType])
}
