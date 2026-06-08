import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { useReports, type PeriodType } from '@/hooks/useReports'

function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function formatCop(amount: number): string {
  return `$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount)} COP`
}

export default function ReportsPage() {
  const [periodType, setPeriodType] = useState<PeriodType>('month')
  const { periods, loading, error } = useReports(periodType)

  if (loading) {
    return (
      <>
        <PageHeader title="Reports" subtitle="Overall balance and history" />
        <div className="py-10 text-center text-text-muted">Loading reports…</div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <PageHeader title="Reports" subtitle="Overall balance and history" />
        <div className="py-10 text-center text-danger-strong">{error}</div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Overall balance split by time period"
      />

      <div className="mb-6 flex space-x-2 border-b border-border/50 pb-4">
        {[
          { id: 'month', label: 'Monthly' },
          { id: 'quarter', label: 'Quarterly' },
          { id: 'semester', label: 'Semester' },
          { id: 'year', label: 'Yearly' },
        ].map(pt => (
          <button
            key={pt.id}
            onClick={() => setPeriodType(pt.id as PeriodType)}
            className={`rounded-md px-4 py-2 text-[13px] font-medium transition-colors ${
              periodType === pt.id
                ? 'bg-brand text-surface'
                : 'bg-surface-2/40 text-text-muted hover:bg-surface-2/60 hover:text-text'
            }`}
          >
            {pt.label}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {periods.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-text-muted">
            No transactions recorded to analyze.
          </div>
        ) : (
          periods.map(period => (
            <div key={period.sortKey} className="overflow-hidden rounded-[10px] border border-border bg-surface">
              <div className="border-b border-border/50 bg-surface-2/30 px-5 py-4">
                <h3 className="text-[15px] font-medium text-text">{period.label}</h3>
              </div>
              
              <div className="p-5">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                  <MetricCard label="Total income" usd={period.income} cop={period.incomeCop} isPositive={true} />
                  <MetricCard label="Total expenses" usd={period.expense} cop={period.expenseCop} />
                  <MetricCard label="Debt payments" usd={period.debt} cop={period.debtCop} />
                  <MetricCard label="Tithe/offerings" usd={period.tithe} cop={period.titheCop} />
                  
                  <div className="rounded-lg bg-surface-2/40 p-3">
                    <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.06em] text-text-muted">
                      Net cash flow
                    </div>
                    <div className={`font-mono text-[16px] font-medium ${period.netBalance >= 0 ? 'text-brand' : 'text-danger-strong'}`}>
                      {formatUsd(period.netBalance)}
                    </div>
                    <div className="mt-1 text-[11px] text-text-faint">
                      {formatCop(period.netBalanceCop)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )
}

function MetricCard({ label, usd, cop, isPositive }: { label: string, usd: number, cop: number, isPositive?: boolean }) {
  if (usd === 0 && cop === 0) {
    return (
      <div className="rounded-lg border border-border/40 p-3">
        <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.06em] text-text-muted">
          {label}
        </div>
        <div className="font-mono text-[14px] text-text-faint">-</div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border/40 p-3">
      <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.06em] text-text-muted">
        {label}
      </div>
      <div className={`font-mono text-[14px] font-medium ${isPositive ? 'text-brand' : 'text-text'}`}>
        {formatUsd(usd)}
      </div>
      <div className="mt-1 text-[11px] text-text-faint">
        {formatCop(cop)}
      </div>
    </div>
  )
}
