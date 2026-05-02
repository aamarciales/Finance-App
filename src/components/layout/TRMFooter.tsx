import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { formatTRM } from '@/lib/format'

/**
 * Footer del sidebar con TRM del día.
 *
 * Fase 1: TRM hardcodeada (placeholder visual). En Fase 3 se conecta a
 * `useTRM` que consulta Banco de la República y cachea en Dexie.
 * Decisión: dejar el componente listo para recibir props reales más adelante.
 */
const PLACEHOLDER_TRM = 4087.3
const PLACEHOLDER_DELTA_PCT = 0.42

interface TRMFooterProps {
  className?: string
}

export function TRMFooter({ className }: TRMFooterProps) {
  const today = format(new Date(), "d MMM", { locale: es })
  const delta = PLACEHOLDER_DELTA_PCT

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-surface p-3 text-xs',
        className,
      )}
    >
      <div className="mb-1 text-[10.5px] uppercase tracking-[0.08em] text-text-faint">
        TRM hoy · {today}
      </div>
      <div className="font-mono text-[14px]">{formatTRM(PLACEHOLDER_TRM)} COP</div>
      <div className="font-mono text-[11px] text-brand">
        {delta >= 0 ? '↗' : '↘'} {delta >= 0 ? '+' : ''}
        {delta.toFixed(2)}% vs ayer
      </div>
    </div>
  )
}
