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
  amount: number
  currency: Currency
  secondary?: string
  icon: LucideIcon
  tone?: 'brand' | 'warm' | 'gold' | 'danger' | 'info'
  onClick?: () => void
}

export function KpiCard({ label, amount, currency, secondary, icon: Icon, tone = 'brand', onClick }: KpiCardProps) {
  return (
    <div
      className={cn('rounded-[10px] border border-border bg-surface px-6 py-[22px]', onClick && 'cursor-pointer hover:border-brand/40 transition-colors')}
      onClick={onClick}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] text-text-muted">{label}</span>
        <Icon className={cn('h-4 w-4', TONE_CLASSES[tone])} strokeWidth={1.8} />
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
