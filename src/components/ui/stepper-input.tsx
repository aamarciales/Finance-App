import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StepperInputProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  className?: string
}

export function StepperInput({ value, onChange, min = 0, max = 100, step = 0.5, className }: StepperInputProps) {
  function clamp(v: number) {
    return Math.min(max, Math.max(min, v))
  }

  return (
    <div className={cn('flex h-8 w-[6.5rem] shrink-0 items-stretch', className)}>
      <button
        type="button"
        onClick={() => onChange(clamp(Math.round((value - step) * 100) / 100))}
        disabled={value <= min}
        className="flex w-8 shrink-0 items-center justify-center rounded-l-md border border-r-0 border-border bg-surface text-text-muted transition-colors hover:bg-surface-2 hover:text-text active:bg-surface-2 disabled:pointer-events-none disabled:opacity-30"
      >
        <Minus className="h-3 w-3" strokeWidth={2} />
      </button>
      <input
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const v = parseFloat(e.target.value)
          if (!isNaN(v)) onChange(clamp(v))
        }}
        onFocus={(e) => e.target.select()}
        className="no-number-spinner min-w-0 flex-1 border-y border-border bg-surface px-1 py-0 text-center font-mono text-[13px] leading-none outline-none focus:border-[var(--border-strong)] focus:ring-2 focus:ring-black/[0.05]"
      />
      <button
        type="button"
        onClick={() => onChange(clamp(Math.round((value + step) * 100) / 100))}
        disabled={value >= max}
        className="flex w-8 shrink-0 items-center justify-center rounded-r-md border border-l-0 border-border bg-surface text-text-muted transition-colors hover:bg-surface-2 hover:text-text active:bg-surface-2 disabled:pointer-events-none disabled:opacity-30"
      >
        <Plus className="h-3 w-3" strokeWidth={2} />
      </button>
    </div>
  )
}
