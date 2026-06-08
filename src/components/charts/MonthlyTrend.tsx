import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'
import { format, parse } from 'date-fns'
import { displayLocale } from '../../lib/locale'
import { formatMoney } from '@/lib/format'
import type { MonthData } from '@/hooks/useDashboard'

interface MonthlyTrendProps {
  data: MonthData[]
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) {
  if (!active || !payload?.length || !label) return null
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-[12px] shadow-sm">
      <div className="mb-1 font-medium">{formatMonth(label)}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="font-mono" style={{ color: p.dataKey === 'income' ? 'var(--brand)' : 'var(--warm)' }}>
          {p.dataKey === 'income' ? 'Income' : 'Expenses'}: {formatMoney(p.value, 'USD')}
        </div>
      ))}
    </div>
  )
}

function formatMonth(monthStr: string): string {
  try {
    const d = parse(monthStr, 'yyyy-MM', new Date())
    return format(d, 'MMMM yyyy', { locale: displayLocale })
  } catch {
    return monthStr
  }
}

export function MonthlyTrend({ data }: MonthlyTrendProps) {
  const chartData = data.map((d) => ({
    ...d,
    label: (() => {
      try {
        const dt = parse(d.month, 'yyyy-MM', new Date())
        return format(dt, 'MMM', { locale: displayLocale })
      } catch {
        return d.month
      }
    })(),
  }))

  return (
    <div className="rounded-[10px] border border-border bg-surface p-6">
      <h3 className="mb-4 text-[13px] font-medium text-text-muted">Tendencia mensual</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} barGap={2} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--text-faint)' }}
            axisLine={false}
            tickLine={false}
            width={50}
            tickFormatter={(v: number) => `$${v}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="income" fill="var(--brand)" radius={[4, 4, 0, 0]} name="Income" />
          <Bar dataKey="expenses" fill="var(--warm)" radius={[4, 4, 0, 0]} name="Expenses" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
