import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { useApi } from '@/lib/api'
import { useSettings } from '@/hooks/useSettings'
import type { Currency, TitheCommitment } from '@/types/domain'

export interface TithePaymentRecord {
  id: number
  date: string
  amountUsd: number
  amountCop: number | null
  currency: Currency
  paidTo: string
  type: string
  notes: string | null
  attachmentUrl: string | null
  transactionId: number | null
  createdAt: string
}

export interface RegisterPaymentData {
  date: string
  commitmentIds: number[]
  amountUsd: number
  amountCop?: number
  currency: Currency
  trm: number
  destination: string
  attachmentUrl?: string
  notes?: string
}

export interface RegisterDebtPaymentData {
  date: string
  amountUsd: number
  currency: Currency
  trm: number
}

export interface MonthlyCompliance {
  month: string
  committed: number
  paid: number
  percent: number
}

export function useTitheCommitments() {
  const api = useApi()
  const queryClient = useQueryClient()
  const { settings } = useSettings()

  const { data: commitmentsData, isLoading: loadingCommitments } = useQuery({
    queryKey: ['tithe-commitments'],
    queryFn: () => api.get<TitheCommitment[]>('/tithe-commitments'),
  })

  const { data: paymentsData, isLoading: loadingPayments } = useQuery({
    queryKey: ['tithe-payments'],
    queryFn: () => api.get<TithePaymentRecord[]>('/tithe-payments'),
  })

  const { data: pendingSummary } = useQuery({
    queryKey: ['tithe-commitments', 'pending-summary'],
    queryFn: () => api.get<{ totalPending: number; totalPaid: number; pendingCount: number }>('/tithe-commitments/pending-summary'),
  })

  const commitments = commitmentsData ?? []
  const payments = paymentsData ?? []

  const pendingCommitments = useMemo(
    () => commitments.filter(c => c.status === 'pending'),
    [commitments],
  )

  const paidCommitments = useMemo(
    () => commitments.filter(c => c.status === 'paid'),
    [commitments],
  )

  const monthlyCompliance = useMemo(() => {
    const now = new Date()
    const months: MonthlyCompliance[] = []

    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i)
      const monthKey = format(d, 'yyyy-MM')
      const ms = format(startOfMonth(d), 'yyyy-MM-dd')
      const me = format(endOfMonth(d), 'yyyy-MM-dd')

      const monthCommitments = commitments.filter(c => c.date >= ms && c.date <= me)
      const committed = monthCommitments.reduce((s, c) => s + c.totalAmount, 0)

      const monthPaidCommitments = monthCommitments.filter(c => c.status === 'paid')
      const paid = monthPaidCommitments.reduce((s, c) => s + c.totalAmount, 0)

      const percent = committed > 0 ? Math.round((paid / committed) * 100) : 0

      months.push({ month: monthKey, committed, paid, percent })
    }

    return months
  }, [commitments])

  const registerPayment = useMutation({
    mutationFn: (data: RegisterPaymentData) => api.post('/tithe-payments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tithe-commitments'] })
      queryClient.invalidateQueries({ queryKey: ['tithe-payments'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })

  const registerDebtPayment = useMutation({
    mutationFn: (data: RegisterDebtPaymentData) => api.post('/tithe-payments/debt-payment', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tithe-commitments'] })
      queryClient.invalidateQueries({ queryKey: ['tithe-payments'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })

  const titheDebtUsd = settings?.titheDebtUsd ?? 0

  return {
    commitments,
    payments,
    pendingCommitments,
    paidCommitments,
    pendingSummary: pendingSummary ?? { totalPending: 0, totalPaid: 0, pendingCount: 0 },
    monthlyCompliance,
    titheDebtUsd,
    loading: loadingCommitments || loadingPayments,
    registerPayment,
    registerDebtPayment,
  }
}
