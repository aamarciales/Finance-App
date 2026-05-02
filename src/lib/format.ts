import type { Currency } from '@/types/domain'

/**
 * Formato de moneda según el HTML reference:
 *  - COP: "$184.520"           (sin decimales, miles con punto)
 *  - USD: "USD 45,14"          (prefijo "USD", coma decimal)
 *
 * Recibe `amount` en unidades enteras de la moneda (no en cents). Para cents,
 * pasar `amount / 100` desde el caller — TODO: integrar dinero.js cuando
 * añadamos cálculos sumatorios reales (Fase 2+).
 */
export function formatMoney(amount: number, currency: Currency): string {
  if (currency === 'COP') {
    /* es-CO: "$184.520" */
    const formatted = new Intl.NumberFormat('es-CO', {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(Math.abs(amount))
    const sign = amount < 0 ? '−' : ''
    return `${sign}$${formatted}`
  }

  /* USD: "USD 45,14" — prefijo USD, coma decimal estilo es-CO */
  const formatted = new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(Math.abs(amount))
  const sign = amount < 0 ? '−' : ''
  return `${sign}USD ${formatted}`
}

/**
 * Variante "compact" para KPIs grandes (sin signo, currency aparte).
 * El componente <Money> coloca el currency como prefijo separado.
 */
export function formatAmountOnly(amount: number, currency: Currency): string {
  const fractionDigits = currency === 'COP' ? 0 : 2
  return new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(Math.abs(amount))
}

/** Formato de TRM: "$4.087,30" (siempre 2 decimales, símbolo $). */
export function formatTRM(rate: number): string {
  const formatted = new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(rate)
  return `$${formatted}`
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return `${value.toFixed(fractionDigits)}%`
}
