import { format, parseISO } from 'date-fns'
import { displayLocale } from '../../lib/locale'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { MonthlyCompliance } from '@/hooks/useTitheCommitments'

interface ComplianceChartProps {
  data: MonthlyCompliance[]
}

export function ComplianceChart({ data }: ComplianceChartProps) {
  const chartData = data.map(d => {
    const [y, m] = d.month.split('-')
    const label = format(parseISO(`${y}-${m}-01`), 'MMM', { locale: displayLocale })
    return { name: label, ...d }
  })

  return (
    <div className="h-[180px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: '#9a978d' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: '#9a978d' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip
            formatter={(value: unknown) => [`${value}%`, 'Compliance']}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Bar dataKey="percent" radius={[4, 4, 0, 0]} maxBarSize={32}>
            {chartData.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.percent >= 100 ? '#2d4a3e' : entry.percent >= 50 ? '#b8923a' : '#a83e2b'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
