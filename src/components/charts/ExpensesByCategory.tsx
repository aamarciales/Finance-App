import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { formatMoney } from '@/lib/format'
import { EmptyState } from '@/components/common/EmptyState'
import type { CategoryExpense } from '@/hooks/useDashboard'

interface ExpensesByCategoryProps {
  data: CategoryExpense[]
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: CategoryExpense }> }) {
  if (!active || !payload?.[0]) return null
  const item = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-[12px] shadow-sm">
      <div className="flex items-center gap-1.5">
        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
        <span className="font-medium">{item.name}</span>
      </div>
      <div className="mt-0.5 font-mono text-text-muted">{formatMoney(item.amount, 'USD')}</div>
    </div>
  )
}

export function ExpensesByCategory({ data }: ExpensesByCategoryProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-[10px] border border-border bg-surface p-6">
        <h3 className="mb-4 text-[11px] uppercase tracking-[0.08em] text-text-muted">Expenses by category</h3>
        <EmptyState title="No expenses" description="No expenses this month" />
      </div>
    )
  }

  const total = data.reduce((s, d) => s + d.amount, 0)

  return (
    <div className="rounded-[10px] border border-border bg-surface p-6">
      <h3 className="mb-4 text-[11px] uppercase tracking-[0.08em] text-text-muted">Expenses by category</h3>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={2}
            dataKey="amount"
            stroke="none"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-4 space-y-1.5">
        {data.map((item) => {
          const pct = total > 0 ? ((item.amount / total) * 100).toFixed(0) : '0'
          return (
            <div key={item.name} className="flex items-center justify-between text-[12px]">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-text-muted">{item.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono">{formatMoney(item.amount, 'USD')}</span>
                <span className="w-8 text-right text-text-faint">{pct}%</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
