import type { Currency } from '@/types/domain'
import { numberLocale } from '@/lib/locale'

/**
 * Currency display for the UI (en-US number formatting).
 * `amount` is in whole currency units (not cents).
 */
export function formatMoney(amount: number, currency: Currency): string {
  if (currency === 'COP') {
    const formatted = new Intl.NumberFormat(numberLocale, {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(Math.abs(amount))
    const sign = amount < 0 ? '−' : ''
    return `${sign}$${formatted}`
  }

  const formatted = new Intl.NumberFormat(numberLocale, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(Math.abs(amount))
  const sign = amount < 0 ? '−' : ''
  return `${sign}USD ${formatted}`
}

/** Compact amount for KPIs (currency shown separately by <Money>). */
export function formatAmountOnly(amount: number, currency: Currency): string {
  const fractionDigits = currency === 'COP' ? 0 : 2
  return new Intl.NumberFormat(numberLocale, {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(Math.abs(amount))
}

/** FX rate display: "$4,087.30" (always 2 decimals). */
export function formatTRM(rate: number): string {
  const formatted = new Intl.NumberFormat(numberLocale, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(rate)
  return `$${formatted}`
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return `${value.toFixed(fractionDigits)}%`
}
