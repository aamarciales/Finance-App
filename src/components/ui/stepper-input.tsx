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
    <div className={cn('flex items-center gap-1', className)}>
      <button
        type="button"
        onClick={() => onChange(clamp(Math.round((value - step) * 100) / 100))}
        disabled={value <= min}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-text-muted transition-colors hover:bg-surface-2 hover:text-text active:bg-surface-2 disabled:opacity-30 disabled:pointer-events-none"
      >
        <Minus className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
      <div className="relative flex-1 min-w-[48px]">
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
          className="h-9 w-full rounded-md border border-border bg-surface px-2 py-1 text-center font-mono text-[14px] outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
        />
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-text-faint">%</span>
      </div>
      <button
        type="button"
        onClick={() => onChange(clamp(Math.round((value + step) * 100) / 100))}
        disabled={value >= max}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-text-muted transition-colors hover:bg-surface-2 hover:text-text active:bg-surface-2 disabled:opacity-30 disabled:pointer-events-none"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </div>
  )
}
