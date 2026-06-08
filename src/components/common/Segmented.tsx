import { cn } from '@/lib/utils'

type SegmentedProps = {
  options: { id: string; label: string }[]
  value: string
  onChange: (id: string) => void
}

/** Horizontal pill tabs — mirrors trakll Segmented (hidden scrollbar). */
export function Segmented({ options, value, onChange }: SegmentedProps) {
  return (
    <div className="pt-seg-scroll">
      <div className="pt-seg" role="tablist">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={value === opt.id}
            className={cn(value === opt.id && 'on')}
            onClick={() => onChange(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
