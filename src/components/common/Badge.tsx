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
  color?: string
  children: ReactNode
  className?: string
}

function hexToSoftBg(hex: string): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, 0.12)`
}

export function Badge({ tone = 'gray', color, children, className }: BadgeProps) {
  const style = color
    ? { backgroundColor: hexToSoftBg(color), color }
    : undefined

  return (
    <span
      className={cn(
        'inline-block rounded-[10px] px-2 py-0.5 font-mono text-[11px]',
        !color && TONE_CLASSES[tone],
        className,
      )}
      style={style}
    >
      {children}
    </span>
  )
}
