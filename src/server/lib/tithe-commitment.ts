/** USD tolerance when comparing payments to commitment totals (TRM drift). */
export const TITHE_PAYMENT_TOLERANCE_USD = 0.75
export const TITHE_PAYMENT_TOLERANCE_PCT = 0.03

export function computeTitheAmounts(
  amountBase: number,
  categoryId: number,
  titheConfig: {
    defaultTithe?: number
    defaultOffering?: number
    tithePercentByIncomeCategory?: Record<string | number, { tithe?: number; offering?: number }>
  },
) {
  const defaultTithe = titheConfig?.defaultTithe ?? 10
  const defaultOffering = titheConfig?.defaultOffering ?? 10
  const catConfig =
    titheConfig?.tithePercentByIncomeCategory?.[categoryId]
    ?? titheConfig?.tithePercentByIncomeCategory?.[String(categoryId)]
  const tithePct = catConfig?.tithe ?? defaultTithe
  const offeringPct = catConfig?.offering ?? defaultOffering
  const tithe = Math.round(amountBase * (tithePct / 100) * 100) / 100
  const offering = Math.round(amountBase * (offeringPct / 100) * 100) / 100
  return { tithe, offering, tithePct, offeringPct }
}

export function isCommitmentFullyPaid(totalPaidUsd: number, commitmentTotalUsd: number): boolean {
  if (totalPaidUsd <= 0) return false
  if (totalPaidUsd >= commitmentTotalUsd) return true
  const shortfall = commitmentTotalUsd - totalPaidUsd
  return (
    shortfall <= TITHE_PAYMENT_TOLERANCE_USD
    || shortfall / commitmentTotalUsd <= TITHE_PAYMENT_TOLERANCE_PCT
  )
}

export function resolveCommitmentStatus(
  totalPaidUsd: number,
  commitmentTotalUsd: number,
  storedStatus: 'pending' | 'partial' | 'paid' | 'debt',
  markAsComplete = false,
): 'pending' | 'partial' | 'paid' | 'debt' {
  if (storedStatus === 'paid') return 'paid'
  if (storedStatus === 'debt' && totalPaidUsd <= 0) return 'debt'
  if (markAsComplete && totalPaidUsd > 0) return 'paid'
  if (isCommitmentFullyPaid(totalPaidUsd, commitmentTotalUsd)) return 'paid'
  if (totalPaidUsd > 0) return 'partial'
  return storedStatus === 'debt' ? 'debt' : 'pending'
}

/** Remaining USD to allocate when user confirms full payment despite TRM drift. */
export function commitmentPaymentShortfall(
  totalPaidUsd: number,
  commitmentTotalUsd: number,
): number {
  if (totalPaidUsd <= 0) return commitmentTotalUsd
  return Math.max(0, Math.round((commitmentTotalUsd - totalPaidUsd) * 100) / 100)
}
