import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, startOfYear, endOfYear, startOfQuarter, endOfQuarter } from 'date-fns'
import { useApi } from '@/lib/api'
import { calculateTitheForIncome } from '@/lib/tithe'
import { useSettings } from '@/hooks/useSettings'
import type { Category, Transaction } from '@/types/domain'

export type DashboardPeriod = 'this-month' | 'last-month' | 'this-week' | 'quarter' | 'semester' | 'year' | 'all'

export interface EnrichedTransaction extends Transaction {
  category: Category
}

export interface CategoryExpense {
  name: string
  amount: number
  color: string
}

export interface MonthData {
  month: string
  income: number
  expenses: number
}

export interface TitheBreakdown {
  byCategory: Array<{ name: string; tithePct: number; offeringPct: number; income: number; tithe: number; offering: number }>
  totalTithe: number
  totalOffering: number
  totalCop: number
  totalUsd: number
}

export interface InsightData {
  text: string
  savingsCop: number
}

export interface DashboardData {
  totalBalance: number
  totalBalanceCop: number
  monthIncome: number
  monthExpenses: number
  tithePending: number
  titheBreakdown: TitheBreakdown
  insight: InsightData | null
  expensesByCategory: CategoryExpense[]
  monthlyTrend: MonthData[]
  recentTransactions: EnrichedTransaction[]
  monthIncomeCop: number
  monthExpensesCop: number
  availableCapital: number
  availableCapitalCop: number
  loading: boolean
}

function isKpiTransaction(tx: Transaction): boolean {
  return tx.type !== 'transfer'
}

export function useDashboard(period: DashboardPeriod = 'this-month'): DashboardData {
  const { settings } = useSettings()

  const now = new Date()

  const { periodStart, periodEnd, trendStart, prevPeriodStart, prevPeriodEnd } = useMemo(() => {
    let ps: Date, pe: Date
    switch (period) {
      case 'this-week':
        ps = startOfWeek(now, { weekStartsOn: 1 })
        pe = endOfWeek(now, { weekStartsOn: 1 })
        break
      case 'last-month':
        ps = startOfMonth(subMonths(now, 1))
        pe = endOfMonth(subMonths(now, 1))
        break
      case 'quarter':
        ps = startOfQuarter(now)
        pe = endOfQuarter(now)
        break
      case 'semester': {
        const m = now.getMonth()
        ps = m < 6 ? new Date(now.getFullYear(), 0, 1) : new Date(now.getFullYear(), 6, 1)
        pe = m < 6 ? new Date(now.getFullYear(), 5, 30) : new Date(now.getFullYear(), 11, 31)
        break
      }
      case 'year':
        ps = startOfYear(now)
        pe = endOfYear(now)
        break
      case 'all':
        ps = new Date('1970-01-01')
        pe = now
        break
      default: // this-month
        ps = startOfMonth(now)
        pe = endOfMonth(now)
    }

    const durationDays = (pe.getTime() - ps.getTime()) / (1000 * 60 * 60 * 24)
    const prevPe = new Date(ps.getTime() - 1)
    const prevPs = new Date(prevPe.getTime() - durationDays * 1000 * 60 * 60 * 24)

    return {
      periodStart: format(ps, 'yyyy-MM-dd'),
      periodEnd: format(pe, 'yyyy-MM-dd'),
      trendStart: format(startOfMonth(subMonths(now, 5)), 'yyyy-MM-dd'),
      prevPeriodStart: format(prevPs, 'yyyy-MM-dd'),
      prevPeriodEnd: format(prevPe, 'yyyy-MM-dd'),
    }
  }, [period])

  const monthStart = periodStart
  const monthEnd = periodEnd
  const prevMonthStart = prevPeriodStart
  const prevMonthEnd = prevPeriodEnd

  const api = useApi()

  const { data: transactionsData } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => api.get<Transaction[]>('/transactions'),
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/categories'),
  })

  const { data: titheSummary } = useQuery({
    queryKey: ['tithe-commitments', 'pending-summary'],
    queryFn: () => api.get<{ totalPending: number; totalPaid: number; pendingCount: number }>('/tithe-commitments/pending-summary'),
  })

  const transactions = transactionsData ?? null
  const categories = categoriesData ?? []

  const categoryMap = useMemo(() => {
    const m = new Map<number, Category>()
    for (const c of categories) {
      if (c.id != null) m.set(c.id, c)
    }
    return m
  }, [categories])

  return useMemo(() => {
    if (!transactions) {
      return {
        totalBalance: 0, totalBalanceCop: 0, monthIncome: 0, monthExpenses: 0, tithePending: 0,
        titheBreakdown: { byCategory: [], totalTithe: 0, totalOffering: 0, totalCop: 0, totalUsd: 0 },
        insight: null,
        expensesByCategory: [], monthlyTrend: [], recentTransactions: [],
        monthIncomeCop: 0, monthExpensesCop: 0, availableCapital: 0, availableCapitalCop: 0, loading: true,
      }
    }

    // KPI transactions only (exclude transfers)
    const kpiTxs = transactions.filter(isKpiTransaction)

    // Total balance: all time
    const totalBalance = kpiTxs.reduce((sum, tx) => {
      return sum + (tx.type === 'income' ? tx.amountInBase : -tx.amountInBase)
    }, 0)
    const totalBalanceCop = kpiTxs.reduce((sum, tx) => {
      return sum + (tx.type === 'income' ? tx.amountInSecondary : -tx.amountInSecondary)
    }, 0)

    // Current month txs
    const monthTxs = kpiTxs.filter(tx => tx.date >= monthStart && tx.date <= monthEnd)
    const prevMonthTxs = kpiTxs.filter(tx => tx.date >= prevMonthStart && tx.date <= prevMonthEnd)
    const monthIncome = monthTxs.filter(tx => tx.type === 'income').reduce((s, tx) => s + tx.amountInBase, 0)
    const monthExpenses = monthTxs.filter(tx => tx.type === 'expense' || tx.type === 'debt_payment').reduce((s, tx) => s + tx.amountInBase, 0)
    const monthIncomeCop = monthTxs.filter(tx => tx.type === 'income').reduce((s, tx) => s + tx.amountInSecondary, 0)
    const monthExpensesCop = monthTxs.filter(tx => tx.type === 'expense' || tx.type === 'debt_payment').reduce((s, tx) => s + tx.amountInSecondary, 0)

    // Tithe — from commitments API
    const tithePending = titheSummary?.totalPending ?? 0

    const titheBreakdown: TitheBreakdown = { byCategory: [], totalTithe: 0, totalOffering: 0, totalCop: 0, totalUsd: tithePending }
    if (settings) {
      const allIncomeTxs = monthTxs.filter(tx => tx.type === 'income')
      const titheByCategory = new Map<number, { income: number; tithe: number; offering: number; tithePct: number; offeringPct: number }>()

      for (const tx of allIncomeTxs) {
        const result = calculateTitheForIncome(tx.amountInBase, tx.categoryId, settings)
        const cfg = settings.titheConfig.tithePercentByIncomeCategory[tx.categoryId]
        const tPct = cfg?.tithe ?? settings.titheConfig.defaultTithe
        const oPct = cfg?.offering ?? settings.titheConfig.defaultOffering

        const existing = titheByCategory.get(tx.categoryId)
        if (existing) {
          existing.income += tx.amountInBase
          existing.tithe += result.tithe
          existing.offering += result.offering
        } else {
          titheByCategory.set(tx.categoryId, { income: tx.amountInBase, tithe: result.tithe, offering: result.offering, tithePct: tPct, offeringPct: oPct })
        }
      }

      for (const [catId, data] of titheByCategory) {
        const cat = categoryMap.get(catId)
        titheBreakdown.byCategory.push({ name: cat?.name ?? 'Otros', ...data })
      }
      titheBreakdown.totalTithe = titheBreakdown.byCategory.reduce((s, c) => s + c.tithe, 0)
      titheBreakdown.totalOffering = titheBreakdown.byCategory.reduce((s, c) => s + c.offering, 0)
      titheBreakdown.totalUsd = titheBreakdown.totalTithe + titheBreakdown.totalOffering
    }

    titheBreakdown.totalCop = Math.round(titheBreakdown.totalUsd * (monthIncomeCop / (monthIncome || 1)))

    // Insight: compare current month supermarket expense vs previous month
    let insight: InsightData | null = null
    {
      const catExpenseThisMonth = new Map<string, number>()
      const catExpensePrevMonth = new Map<string, number>()
      for (const tx of monthTxs) {
        if (tx.type === 'expense' || tx.type === 'debt_payment') {
          const catName = categoryMap.get(tx.categoryId)?.name ?? 'Otros'
          catExpenseThisMonth.set(catName, (catExpenseThisMonth.get(catName) ?? 0) + tx.amountInSecondary)
        }
      }
      for (const tx of prevMonthTxs) {
        if (tx.type === 'expense' || tx.type === 'debt_payment') {
          const catName = categoryMap.get(tx.categoryId)?.name ?? 'Otros'
          catExpensePrevMonth.set(catName, (catExpensePrevMonth.get(catName) ?? 0) + tx.amountInSecondary)
        }
      }

      // Find category with biggest change
      let bestCat = ''
      let bestDiff = 0
      let bestThis = 0
      let bestPrev = 0
      for (const [catName, thisAmount] of catExpenseThisMonth) {
        const prevAmount = catExpensePrevMonth.get(catName) ?? 0
        if (prevAmount > 0) {
          const diffPct = ((thisAmount - prevAmount) / prevAmount) * 100
          if (Math.abs(diffPct) > Math.abs(bestDiff)) {
            bestDiff = diffPct
            bestCat = catName
            bestThis = thisAmount
            bestPrev = prevAmount
          }
        }
      }

      if (bestCat && bestPrev > 0) {
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
        const dayOfMonth = now.getDate()
        const projectedEnd = Math.round(bestThis * (daysInMonth / dayOfMonth))
        const savingsCop = Math.round(bestPrev - projectedEnd)

        if (bestDiff < -5) {
          insight = {
            text: `Vas ${Math.abs(bestDiff).toFixed(0)}% por debajo de tu gasto promedio en ${bestCat.toLowerCase()}. A este ritmo, ahorrarás cerca de`,
            savingsCop: Math.abs(savingsCop),
          }
        } else if (bestDiff > 10) {
          insight = {
            text: `Tu gasto en ${bestCat.toLowerCase()} va ${bestDiff.toFixed(0)}% por encima del mes pasado. Al cierre del mes podrías gastar cerca de`,
            savingsCop: Math.abs(projectedEnd - bestPrev),
          }
        }
      }
    }

    // Expenses by category (top 5)
    const expenseByCat = new Map<number, number>()
    for (const tx of monthTxs) {
      if (tx.type === 'expense' || tx.type === 'debt_payment') {
        expenseByCat.set(tx.categoryId, (expenseByCat.get(tx.categoryId) ?? 0) + tx.amountInBase)
      }
    }
    const expensesByCategory: CategoryExpense[] = [...expenseByCat.entries()]
      .map(([catId, amount]) => {
        const cat = categoryMap.get(catId)
        return { name: cat?.name ?? 'Otros', amount, color: cat?.color ?? '#9a978d' }
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)

    // Monthly trend (last 6 months)
    const trendTxs = kpiTxs.filter(tx => tx.date >= trendStart)
    const monthMap = new Map<string, { income: number; expenses: number }>()
    for (let i = 0; i < 6; i++) {
      const d = subMonths(now, 5 - i)
      const key = format(d, 'yyyy-MM')
      monthMap.set(key, { income: 0, expenses: 0 })
    }
    for (const tx of trendTxs) {
      const key = tx.date.slice(0, 7)
      const entry = monthMap.get(key)
      if (!entry) continue
      if (tx.type === 'income') entry.income += tx.amountInBase
      else entry.expenses += tx.amountInBase
    }
    const monthlyTrend: MonthData[] = [...monthMap.entries()].map(([key, data]) => ({
      month: key,
      ...data,
    }))

    // Recent 5 enriched
    const recentTransactions: EnrichedTransaction[] = transactions.slice(0, 5).map(tx => ({
      ...tx,
      category: categoryMap.get(tx.categoryId)!,
    })).filter(tx => tx.category)

    // Available capital from settings
    let availableCapital = 0
    let availableCapitalCop = 0
    if (settings?.availableCapitalAmount != null) {
      const capCurrency = settings.availableCapitalCurrency ?? 'COP'
      const capAmount = settings.availableCapitalAmount
      if (capCurrency === 'USD') {
        availableCapital = capAmount
        availableCapitalCop = Math.round(capAmount * (monthIncomeCop / (monthIncome || 1) || 3600))
      } else {
        availableCapitalCop = capAmount
        availableCapital = monthIncome > 0 ? capAmount / (monthIncomeCop / monthIncome) : 0
      }
    }

    return {
      totalBalance,
      totalBalanceCop,
      monthIncome,
      monthExpenses,
      tithePending,
      titheBreakdown,
      insight,
      expensesByCategory,
      monthlyTrend,
      recentTransactions,
      monthIncomeCop,
      monthExpensesCop,
      availableCapital,
      availableCapitalCop,
      loading: false,
    }
  }, [transactions, categories, categoryMap, settings, titheSummary, monthStart, monthEnd, trendStart, prevMonthStart, prevMonthEnd, period])
}
