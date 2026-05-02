import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type BadgeTone =
  | 'green'
  | 'warm'
  | 'gold'
  | 'danger'
  | 'info'
  | 'gray'

const TONE_CLASSES: Record<BadgeTone, string> = {
  green: 'bg-brand-soft text-brand',
  warm: 'bg-warm-soft text-warm',
  gold: 'bg-gold-soft text-gold',
  danger: 'bg-danger-soft text-danger-strong',
  info: 'bg-info-soft text-info',
  gray: 'bg-surface-2 text-text-muted',
}

interface BadgeProps {
  tone?: BadgeTone
  children: ReactNode
  className?: string
}

/** Replica del `.badge-pill` del HTML reference. */
export function Badge({ tone = 'gray', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-block rounded-[10px] px-2 py-0.5 font-mono text-[11px]',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
