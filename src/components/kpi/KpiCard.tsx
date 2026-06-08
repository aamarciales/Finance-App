import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Money } from '@/components/common/Money'
import type { Currency } from '@/types/domain'

const TONE_CLASSES: Record<string, string> = {
  brand: 'text-brand',
  warm: 'text-warm',
  gold: 'text-gold',
  danger: 'text-danger-strong',
  info: 'text-info',
}

interface KpiCardProps {
  label: string
  hint?: string
  amount: number
  currency: Currency
  secondary?: string
  icon: LucideIcon
  tone?: 'brand' | 'warm' | 'gold' | 'danger' | 'info'
  onClick?: () => void
}

export function KpiCard({ label, hint, amount, currency, secondary, icon: Icon, tone = 'brand', onClick }: KpiCardProps) {
  return (
    <div
      className={cn('pt-card px-6 py-[22px]', onClick && 'cursor-pointer hover:border-brand/40 transition-colors')}
      onClick={onClick}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[12px] text-text-muted">{label}</span>
          {hint ? (
            <div className="mt-0.5 text-[10px] leading-tight text-text-faint">{hint}</div>
          ) : null}
        </div>
        <Icon className={cn('h-4 w-4 shrink-0', TONE_CLASSES[tone])} strokeWidth={1.8} />
      </div>
      <Money
        amount={amount}
        currency={currency}
        variant="kpi"
        secondary={secondary}
      />
    </div>
  )
}
