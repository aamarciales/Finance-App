import { cn } from '@/lib/utils'
import { formatAmountOnly } from '@/lib/format'
import type { Currency } from '@/types/domain'

interface MoneyProps {
  amount: number
  currency: Currency
  /** Variante de renderizado. */
  variant?: 'inline' | 'kpi' | 'tabular'
  /** Línea secundaria opcional (equivalente en otra moneda u observación). */
  secondary?: string
  /** Forzar un signo `+` en valores positivos (típico de ingresos). */
  signed?: boolean
  className?: string
}

/**
 * Display canónico de un monto monetario.
 *
 *  - `inline` (default): "USD 45,14" o "$184.520" en la fuente actual.
 *  - `kpi`: serif grande (Fraunces) con prefijo de moneda en sans más pequeño,
 *    como en las cards del dashboard.
 *  - `tabular`: monospace (JetBrains Mono) para tablas y listas, con el signo
 *    a la izquierda si es negativo.
 */
export function Money({
  amount,
  currency,
  variant = 'inline',
  secondary,
  signed = false,
  className,
}: MoneyProps) {
  const isNegative = amount < 0
  const isPositive = amount > 0
  const sign = isNegative ? '−' : signed && isPositive ? '+' : ''
  const formatted = formatAmountOnly(amount, currency)
  const symbol = currency === 'COP' ? '$' : 'USD'

  if (variant === 'kpi') {
    return (
      <div className={cn('leading-none', className)}>
        <div className="font-serif text-[26px] font-medium tracking-[-0.02em]">
          <span className="mr-0.5 font-sans text-sm font-normal text-text-muted">
            {symbol}
          </span>
          {sign}
          {formatted}
        </div>
        {secondary && (
          <div className="mt-1.5 font-mono text-[11.5px] text-text-muted">
            {secondary}
          </div>
        )}
      </div>
    )
  }

  if (variant === 'tabular') {
    return (
      <span className={cn('font-mono tabular-nums text-sm', className)}>
        {sign}
        {currency === 'COP' ? `$${formatted}` : `USD ${formatted}`}
      </span>
    )
  }

  /* inline */
  return (
    <span className={cn(className)}>
      {sign}
      {currency === 'COP' ? `$${formatted}` : `USD ${formatted}`}
    </span>
  )
}
