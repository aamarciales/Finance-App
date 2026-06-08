import { format } from 'date-fns'
import { displayLocale } from '../lib/locale'
import {
  Repeat, ShoppingBag, Bug, TrendingUp, AlertTriangle,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/common/Badge'
import { useInsights } from '@/hooks/useInsights'

function formatCop(amount: number): string {
  return `$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount)}`
}

export default function InsightsPage() {
  const data = useInsights()

  if (data.loading) {
    return (
      <>
        <PageHeader title="Insights" subtitle="Spending patterns, subscriptions, and insights" />
        <div className="py-10 text-center text-text-muted">Loading…</div>
      </>
    )
  }

  const now = new Date()
  const monthLabel = format(now, "MMMM yyyy", { locale: displayLocale })

  return (
    <>
      <PageHeader
        title="Insights"
        subtitle={`Spending patterns and insights · ${monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}`}
      />

      <div className="space-y-6">
        {/* Section 1: Subscriptions */}
        <Section
          icon={<Repeat className="h-4 w-4" />}
          iconTone="info"
          title="Active subscriptions"
          subtitle="Recurring expenses detected in the last 3 months"
        >
          {data.subscriptions.length === 0 ? (
            <EmptyMessage message="No recurring subscriptions detected" />
          ) : (
            <>
              <div className="space-y-2">
                {data.subscriptions.map(sub => (
                  <div
                    key={sub.name}
                    className="flex items-center justify-between rounded-md bg-surface-2/40 px-4 py-3 text-[13px]"
                  >
                    <div className="flex items-center gap-3">
                      <Badge tone={sub.isActive ? 'green' : 'gray'}>
                        {sub.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <span className="font-medium">{sub.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <span className="text-text-muted">{formatCop(sub.monthlyCost)}/mo</span>
                      <span className="font-mono font-medium">{formatCop(sub.annualCost)}/yr</span>
                    </div>
                  </div>
                ))}
              </div>
              {data.totalSubscriptionsAnnual > 0 && (
                <div className="mt-3 rounded-md bg-surface-2/60 px-4 py-3">
                  <span className="text-[12px] text-text-muted">Total annual on active subscriptions: </span>
                  <span className="font-mono text-[14px] font-medium">{formatCop(data.totalSubscriptionsAnnual)}</span>
                </div>
              )}
            </>
          )}
        </Section>

        {/* Section 2: Top items */}
        <Section
          icon={<ShoppingBag className="h-4 w-4" />}
          iconTone="brand"
          title="Most purchased items"
          subtitle="Top 10 products by frequency in invoices"
        >
          {data.topItems.length === 0 ? (
            <EmptyMessage message="No invoice items to analyze" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="text-[11px] uppercase tracking-[0.06em] text-text-faint">
                    <th className="pb-2 font-medium">#</th>
                    <th className="pb-2 font-medium">Item</th>
                    <th className="pb-2 text-right font-medium">Times</th>
                    <th className="pb-2 text-right font-medium">Total</th>
                    <th className="pb-2 text-right font-medium">Avg. price</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topItems.map((item, i) => (
                    <tr key={item.name} className="border-t border-border/30">
                      <td className="py-2 text-text-faint">{i + 1}</td>
                      <td className="py-2 font-medium">{item.name}</td>
                      <td className="py-2 text-right font-mono">{item.count}</td>
                      <td className="py-2 text-right font-mono">{formatCop(item.totalSpent)}</td>
                      <td className="py-2 text-right font-mono text-text-muted">{formatCop(item.avgPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* Section 3: Ant expenses */}
        <Section
          icon={<Bug className="h-4 w-4" />}
          iconTone="warm"
          title="Small recurring expenses"
          subtitle="Small frequent expenses that add up"
        >
          {data.antExpenses.length === 0 ? (
            <EmptyMessage message="No small recurring expenses detected this month" />
          ) : (
            <>
              <div className="space-y-2">
                {data.antExpenses.map(exp => (
                  <div
                    key={exp.category}
                    className="flex items-center justify-between rounded-md bg-surface-2/40 px-4 py-3 text-[13px]"
                  >
                    <div>
                      <span className="font-medium">{exp.category}</span>
                      <span className="ml-2 text-text-muted">{exp.countThisMonth} times this month</span>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-medium">{formatCop(exp.totalThisMonth)}</div>
                      <div className="text-[11px] text-text-muted">{formatCop(exp.annualProjection)}/yr</div>
                    </div>
                  </div>
                ))}
              </div>
              {data.totalAntAnnual > 0 && (
                <div className="mt-3 rounded-md border border-warm/20 bg-warm/5 px-4 py-3">
                  <div className="flex items-center gap-2 text-[12px]">
                    <AlertTriangle className="h-4 w-4 text-warm" />
                    <span className="text-text-muted">
                      At the current pace, your small recurring expenses would total <strong className="text-text">{formatCop(data.totalAntAnnual)}</strong> per year.
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </Section>

        {/* Section 4: Category growth */}
        <Section
          icon={<TrendingUp className="h-4 w-4" />}
          iconTone="gold"
          title="Fastest-growing categories"
          subtitle="Current month vs previous month"
        >
          {data.categoryGrowth.length === 0 ? (
            <EmptyMessage message="Not enough data to compare" />
          ) : (
            <div className="space-y-2">
              {data.categoryGrowth.map(cat => {
                const isHigh = cat.changePct > 30
                return (
                  <div
                    key={cat.name}
                    className="flex items-center justify-between rounded-md bg-surface-2/40 px-4 py-3 text-[13px]"
                  >
                    <div className="flex items-center gap-3">
                      {isHigh && <AlertTriangle className="h-4 w-4 text-danger-strong" />}
                      <span className="font-medium">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <span className="text-text-muted">{formatCop(cat.lastMonth)}</span>
                      <span className="text-text-faint">→</span>
                      <span className="font-mono">{formatCop(cat.thisMonth)}</span>
                      <Badge tone={cat.changePct > 0 ? 'danger' : 'green'}>
                        {cat.changePct > 0 ? '+' : ''}{cat.changePct.toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Section>
      </div>
    </>
  )
}

function Section({ icon, iconTone, title, subtitle, children }: {
  icon: React.ReactNode
  iconTone: 'brand' | 'warm' | 'gold' | 'danger' | 'info'
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  const toneClass: Record<string, string> = {
    brand: 'text-brand',
    warm: 'text-warm',
    gold: 'text-gold',
    danger: 'text-danger-strong',
    info: 'text-info',
  }

  return (
    <div className="rounded-[10px] border border-border bg-surface p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className={toneClass[iconTone]}>{icon}</span>
        <div>
          <h3 className="text-[14px] font-medium">{title}</h3>
          <div className="text-[11.5px] text-text-muted">{subtitle}</div>
        </div>
      </div>
      {children}
    </div>
  )
}

function EmptyMessage({ message }: { message: string }) {
  return (
    <div className="py-6 text-center text-[13px] text-text-muted">{message}</div>
  )
}
