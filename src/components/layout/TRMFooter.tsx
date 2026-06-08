import { format } from 'date-fns'
import { displayLocale } from '../../lib/locale'
import { cn } from '@/lib/utils'
import { formatTRM } from '@/lib/format'
import { useTRM } from '@/hooks/useTRM'
import { useForex } from '@/hooks/useForex'

interface TRMFooterProps {
  className?: string
}

export function TRMFooter({ className }: TRMFooterProps) {
  const { rate, source, loading } = useTRM()
  const { eurToUsd } = useForex()
  const today = format(new Date(), "d MMM", { locale: displayLocale })
  const isOffline = source === 'manual'

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-surface p-3 text-xs',
        className,
      )}
    >
      <div className="mb-1 text-[10.5px] uppercase tracking-[0.08em] text-text-faint">
        FX rate today · {today}
      </div>
      <div className={cn('font-mono text-[14px]', isOffline && 'text-text-muted')}>
        {loading ? 'Loading…' : `${formatTRM(rate)} COP`}
        {isOffline && !loading && (
          <span className="ml-1 text-[11px] text-text-faint">(offline)</span>
        )}
      </div>
      <div className="font-mono text-[11px] text-text-muted">
        EUR/USD: {eurToUsd.toFixed(2)}
      </div>
    </div>
  )
}
