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
    <div className={cn('inline-flex items-center gap-0.5', className)}>
      <button
        type="button"
        onClick={() => onChange(clamp(Math.round((value - step) * 100) / 100))}
        disabled={value <= min}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-l-md border border-r-0 border-border bg-surface text-text-muted transition-colors hover:bg-surface-2 hover:text-text active:bg-surface-2 disabled:opacity-30 disabled:pointer-events-none"
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
        className="h-8 w-12 border-y border-border bg-surface px-1 py-0 text-center font-mono text-[13px] outline-none focus:border-ring focus:ring-1 focus:ring-ring/20"
      />
      <button
        type="button"
        onClick={() => onChange(clamp(Math.round((value + step) * 100) / 100))}
        disabled={value >= max}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-r-md border border-l-0 border-border bg-surface text-text-muted transition-colors hover:bg-surface-2 hover:text-text active:bg-surface-2 disabled:opacity-30 disabled:pointer-events-none"
      >
        <Plus className="h-3 w-3" strokeWidth={2} />
      </button>
    </div>
  )
}
