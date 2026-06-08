import { cn } from '@/lib/utils'
import type { TabFilter } from '@/hooks/useTransactions'

const TABS: { value: TabFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expenses' },
  { value: 'recurring', label: 'Recurring' },
]

interface TxTabsProps {
  value: TabFilter
  onChange: (value: TabFilter) => void
}

export function TxTabs({ value, onChange }: TxTabsProps) {
  return (
    <div className="flex items-center gap-1">
      {TABS.map((tab) => {
        const isActive = tab.value === value
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={cn(
              'rounded-md px-3 py-1.5 text-[13px] transition-colors',
              isActive
                ? 'bg-surface text-text font-medium shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-border'
                : 'text-text-muted hover:bg-black/[0.03] hover:text-text',
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
