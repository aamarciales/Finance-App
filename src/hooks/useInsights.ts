import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/lib/api'
import { useAuthReady } from '@/hooks/useAuthReady'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import type { Category, Transaction } from '@/types/domain'

export interface Subscription {
  name: string
  monthlyCost: number
  annualCost: number
  lastDate: string
  isActive: boolean
}

export interface TopItem {
  name: string
  count: number
  totalSpent: number
  avgPrice: number
}

export interface AntExpense {
  category: string
  totalThisMonth: number
  countThisMonth: number
  annualProjection: number
}

export interface CategoryGrowth {
  name: string
  thisMonth: number
  lastMonth: number
  changePct: number
}

export interface InsightsData {
  subscriptions: Subscription[]
  totalSubscriptionsAnnual: number
  topItems: TopItem[]
  antExpenses: AntExpense[]
  totalAntAnnual: number
  categoryGrowth: CategoryGrowth[]
  loading: boolean
}

const SUBSCRIPTION_KEYWORDS = [
  'netflix', 'spotify', 'disney+', 'hbo max', 'prime video', 'youtube premium',
  'bodytech', 'smartfit', 'sportlife', 'gym', 'gimnasio',
  'coursera', 'udemy', 'platzi', 'icloud', 'google one', 'dropbox',
  'microsoft 365', 'adobe', 'figma',
]

const DELIVERY_KEYWORDS = ['rappi', 'ifood', 'domicilios.com', 'pedidosya', 'uber eats', 'didi food']
const ANT_KEYWORDS = [...DELIVERY_KEYWORDS, 'cafe', 'c café', 'juice', 'snack', 'dulce', 'panaderia', 'panadería']
const ANT_THRESHOLD_COP = 25_000

function normalizeText(t: string): string {
  return t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export function useInsights(): InsightsData {
  const now = new Date()
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd')
  const prevMonthStart = format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd')
  const prevMonthEnd = format(endOfMonth(subMonths(now, 1)), 'yyyy-MM-dd')
  const threeMonthsAgo = format(startOfMonth(subMonths(now, 3)), 'yyyy-MM-dd')

  const api = useApi()
  const authReady = useAuthReady()

  const { data: transactionsData, isPending: loadingTxs } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => api.get<Transaction[]>('/transactions'),
    enabled: authReady,
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/categories'),
    enabled: authReady,
  })

  const { data: invoiceItemsData } = useQuery({
    queryKey: ['invoice-items'],
    queryFn: () => api.get<any[]>('/invoice-items'),
    enabled: authReady,
  })

  const transactions = transactionsData ? transactionsData.filter(tx => tx.date >= threeMonthsAgo) : undefined
  const categories = categoriesData ?? []
  const invoiceItems = invoiceItemsData ?? []

  const categoryMap = useMemo(() => {
    const m = new Map<number, Category>()
    for (const c of categories) {
      if (c.id != null) m.set(c.id, c)
    }
    return m
  }, [categories])

  return useMemo(() => {
    if (loadingTxs || !transactions) {
      return { subscriptions: [], totalSubscriptionsAnnual: 0, topItems: [], antExpenses: [], totalAntAnnual: 0, categoryGrowth: [], loading: true }
    }

    const monthTxs = transactions.filter(tx => tx.date >= monthStart && tx.date <= monthEnd)
    const prevMonthTxs = transactions.filter(tx => tx.date >= prevMonthStart && tx.date <= prevMonthEnd)
    const expenseTxs = transactions.filter(tx => tx.type === 'expense')

    // 1. Subscriptions
    const subMap = new Map<string, { total: number; count: number; lastDate: string }>()
    for (const tx of expenseTxs) {
      const concept = normalizeText(tx.concept)
      for (const kw of SUBSCRIPTION_KEYWORDS) {
        if (concept.includes(kw)) {
          const existing = subMap.get(kw)
          const amountCop = tx.amountInSecondary || tx.amount
          if (existing) {
            existing.total += amountCop
            existing.count++
            if (tx.date > existing.lastDate) existing.lastDate = tx.date
          } else {
            subMap.set(kw, { total: amountCop, count: 1, lastDate: tx.date })
          }
          break
        }
      }
    }

    const subscriptions: Subscription[] = [...subMap.entries()].map(([name, data]) => {
      const monthlyCost = Math.round(data.total / data.count)
      return {
        name: name.charAt(0).toUpperCase() + name.slice(1),
        monthlyCost,
        annualCost: monthlyCost * 12,
        lastDate: data.lastDate,
        isActive: data.lastDate >= monthStart,
      }
    }).sort((a, b) => b.annualCost - a.annualCost)

    const totalSubscriptionsAnnual = subscriptions.filter(s => s.isActive).reduce((s, sub) => s + sub.annualCost, 0)

    // 2. Top items from invoice_items
    const itemMap = new Map<string, { count: number; total: number }>()
    for (const item of invoiceItems) {
      const key = normalizeText(item.name).trim()
      if (!key) continue
      const existing = itemMap.get(key)
      if (existing) {
        existing.count += item.quantity
        existing.total += item.totalPrice
      } else {
        itemMap.set(key, { count: item.quantity, total: item.totalPrice })
      }
    }

    const topItems: TopItem[] = [...itemMap.entries()]
      .map(([name, data]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        count: data.count,
        totalSpent: data.total,
        avgPrice: Math.round(data.total / data.count),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // 3. Ant expenses (small frequent purchases)
    const antMap = new Map<string, { total: number; count: number }>()
    for (const tx of monthTxs) {
      if (tx.type !== 'expense') continue
      const amountCop = tx.amountInSecondary || tx.amount
      const concept = normalizeText(tx.concept)
      let matched = false

      for (const kw of ANT_KEYWORDS) {
        if (concept.includes(kw)) {
          const existing = antMap.get(kw)
          if (existing) {
            existing.total += amountCop
            existing.count++
          } else {
            antMap.set(kw, { total: amountCop, count: 1 })
          }
          matched = true
          break
        }
      }

      if (!matched && amountCop > 0 && amountCop <= ANT_THRESHOLD_COP) {
        const existing = antMap.get('otros_gastos_menores')
        if (existing) {
          existing.total += amountCop
          existing.count++
        } else {
          antMap.set('otros_gastos_menores', { total: amountCop, count: 1 })
        }
      }
    }

    const LABEL_MAP: Record<string, string> = {
      rappi: 'Delivery (Rappi)',
      ifood: 'Delivery (iFood)',
      'domicilios.com': 'Delivery (Domicilios)',
      'uber eats': 'Delivery (Uber Eats)',
      cafe: 'Coffee shops',
      snack: 'Snacks',
    }

    const antExpenses: AntExpense[] = [...antMap.entries()].map(([key, data]) => ({
      category: LABEL_MAP[key] ?? key.charAt(0).toUpperCase() + key.slice(1),
      totalThisMonth: data.total,
      countThisMonth: data.count,
      annualProjection: Math.round(data.total * 12),
    })).sort((a, b) => b.totalThisMonth - a.totalThisMonth)

    const totalAntAnnual = antExpenses.reduce((s, e) => s + e.annualProjection, 0)

    // 4. Category growth
    const catThisMonth = new Map<string, number>()
    const catLastMonth = new Map<string, number>()

    for (const tx of monthTxs) {
      if (tx.type !== 'expense') continue
      const catName = categoryMap.get(tx.categoryId)?.name
      if (!catName) continue
      catThisMonth.set(catName, (catThisMonth.get(catName) ?? 0) + (tx.amountInSecondary || tx.amount))
    }
    for (const tx of prevMonthTxs) {
      if (tx.type !== 'expense') continue
      const catName = categoryMap.get(tx.categoryId)?.name
      if (!catName) continue
      catLastMonth.set(catName, (catLastMonth.get(catName) ?? 0) + (tx.amountInSecondary || tx.amount))
    }

    const categoryGrowth: CategoryGrowth[] = [...catThisMonth.entries()]
      .map(([name, thisMonth]) => {
        const lastMonth = catLastMonth.get(name) ?? 0
        const changePct = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0
        return { name, thisMonth, lastMonth, changePct }
      })
      .filter(g => g.lastMonth > 0)
      .sort((a, b) => b.changePct - a.changePct)
      .slice(0, 5)

    return {
      subscriptions,
      totalSubscriptionsAnnual,
      topItems,
      antExpenses,
      totalAntAnnual,
      categoryGrowth,
      loading: false,
    }
  }, [transactions, categories, categoryMap, invoiceItems, monthStart, monthEnd, prevMonthStart, prevMonthEnd, loadingTxs])
}
