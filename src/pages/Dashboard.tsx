import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { displayLocale } from '../lib/locale'
import {
  Wallet, TrendingUp, TrendingDown, Heart, ArrowRight,
  Paperclip, ChevronRight, Banknote,
} from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Segmented } from '@/components/common/Segmented'
import { Money } from '@/components/common/Money'
import { Badge } from '@/components/common/Badge'
import { CapitalDetailDialog } from '@/components/common/CapitalDetailDialog'
import { KpiCard } from '@/components/kpi/KpiCard'
import { ExpensesByCategory } from '@/components/charts/ExpensesByCategory'
import { MonthlyTrend } from '@/components/charts/MonthlyTrend'
import { useDashboard, type EnrichedTransaction, type DashboardPeriod } from '@/hooks/useDashboard'
import { displayTransactionConcept } from '@/lib/category-display'
import { useSettings } from '@/hooks/useSettings'
import { useUser } from '@clerk/clerk-react'

export default function DashboardPage() {
  const { settings } = useSettings()
  const [period, setPeriod] = useState<DashboardPeriod>('this-month')
  const [capitalDetailOpen, setCapitalDetailOpen] = useState(false)
  const data = useDashboard(period)
  const { user } = useUser()

  const now = new Date()
  const hour = now.getHours()
  const greeting =
    hour < 12 ? 'Good morning' : hour < 19 ? 'Good afternoon' : 'Good evening'
  const monthLabel = format(now, "LLLL yyyy", { locale: displayLocale })
  const month = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)

  const PERIOD_LABELS: Record<DashboardPeriod, string> = {
    'this-month': month,
    'last-month': 'Last month',
    'this-week': 'This week',
    'quarter': 'Quarterly',
    'semester': 'Semester',
    'year': 'Yearly',
    'all': 'All time',
  }
  
  // Prioriza el nombre de Clerk (Google), luego el de Dexie, luego genérico
  const name = user?.firstName || settings?.displayName || 'User'

  function formatCop(amount: number): string {
    return `$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount)} COP`
  }

  return (
    <>
      <PageHeader
        title={
          <>
            {greeting}, <span className="font-semibold text-brand">{name}</span>.
          </>
        }
        subtitle={`${PERIOD_LABELS[period]} · Financial summary`}
      />

      {data.loading ? (
        <div className="py-10 text-center text-text-muted">Loading…</div>
      ) : (
      <div className="space-y-6">
        <PeriodTabs value={period} onChange={setPeriod} />
        {/* Insight Banner */}
        {data.insight && <InsightBanner insight={data.insight} formatCop={formatCop} />}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <KpiCard
            label="Period balance"
            hint="Income minus expenses"
            amount={data.totalBalance}
            currency="USD"
            secondary={formatCop(data.totalBalanceCop)}
            icon={Wallet}
            tone={data.totalBalance >= 0 ? 'brand' : 'danger'}
          />
          <KpiCard
            label="Income this month"
            amount={data.monthIncome}
            currency="USD"
            secondary={formatCop(data.monthIncomeCop)}
            icon={TrendingUp}
            tone="brand"
          />
          <KpiCard
            label="Expenses this month"
            amount={data.monthExpenses}
            currency="USD"
            secondary={formatCop(data.monthExpensesCop)}
            icon={TrendingDown}
            tone="warm"
          />
          <KpiCard
            label="Tithe pending"
            amount={data.tithePending}
            currency="USD"
            icon={Heart}
            tone="brand"
          />
          <KpiCard
            label="Available capital"
            amount={data.availableCapitalCop}
            currency="COP"
            secondary={data.availableCapital > 0 ? `USD ${data.availableCapital.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : undefined}
            icon={Banknote}
            tone="brand"
            onClick={() => setCapitalDetailOpen(true)}
          />
        </div>

        {/* Row 2: Cash Flow + Tithe Card */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
          <MonthlyTrend data={data.monthlyTrend} />
          <TitheCard pending={data.tithePending} />
        </div>

        {/* Section title */}
        <div className="text-[11px] uppercase tracking-[0.1em] text-text-faint">
          Recent activity
        </div>

        {/* Row 3: Transactions + Category chart */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
          {/* Transactions card */}
          <div className="pt-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-6 py-3">
              <div>
                <div className="text-[15px] font-semibold text-text">Transactions</div>
                <div className="text-[11px] text-text-faint font-mono">
                  {data.recentTransactions.length} recent
                </div>
              </div>
              <Link
                to="/transactions"
                className="inline-flex items-center gap-1 text-[12px] text-text-muted transition-colors hover:text-brand"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {data.recentTransactions.length === 0 ? (
              <div className="px-6 py-8 text-center text-[13px] text-text-muted">
                No transactions yet
              </div>
            ) : (
              <div>
                {data.recentTransactions.map((tx) => (
                  <DashboardTxRow key={tx.id} tx={tx} />
                ))}
              </div>
            )}
          </div>

          {/* Category distribution */}
          <ExpensesByCategory data={data.expensesByCategory} />
        </div>
      </div>
      )}

      <CapitalDetailDialog
        open={capitalDetailOpen}
        onOpenChange={setCapitalDetailOpen}
        totalCop={data.availableCapitalCop}
        totalUsd={data.availableCapital}
      />
    </>
  )
}

function InsightBanner({ insight, formatCop }: { insight: NonNullable<ReturnType<typeof useDashboard>['insight']>; formatCop: (n: number) => string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface px-6 py-[22px] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="mb-1.5 text-[10.5px] uppercase tracking-[0.14em] text-text-faint">
        Monthly insight
      </div>
      <p className="text-[17px] font-medium leading-[1.4] tracking-[-0.01em] text-text">
        {insight.text}{' '}
        <span className="fig font-semibold text-brand">{formatCop(insight.savingsCop)}</span>
        {' '}by month end.
      </p>
    </div>
  )
}

function TitheCard({ pending }: { pending: number }) {
  if (pending <= 0) return null

  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-[22px_24px] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-[15px] font-semibold text-text">Tithe & offerings</div>
          <div className="text-[11px] text-text-faint">Pending to give</div>
        </div>
        <Heart className="h-4 w-4 text-brand" strokeWidth={1.8} aria-hidden />
      </div>

      <div className="flex items-baseline justify-between rounded-[var(--radius-btn)] bg-surface-2 px-3.5 py-3">
        <span className="text-[11px] uppercase tracking-[0.08em] text-text-muted">Total pending</span>
        <span className="fig text-[20px] font-semibold tracking-[-0.02em] text-text">
          USD {pending.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      <p className="mt-3.5 border-t border-border pt-3.5 text-[11.5px] leading-[1.55] text-text-muted">
        Each recorded income transaction automatically creates a tithe commitment.
      </p>
    </div>
  )
}

function DashboardTxRow({ tx }: { tx: EnrichedTransaction }) {
  const isIncome = tx.type === 'income'
  const dateLabel = format(parseISO(tx.date), 'dd MMM', { locale: displayLocale })
  const hasInvoice = !!tx.invoiceId
  const hasAttachment = !!(tx.attachments && tx.attachments.length > 0)

  return (
    <div
      className={`flex items-center justify-between px-6 py-2.5 text-[13px] border-b border-border/30 last:border-b-0 transition-colors ${hasInvoice ? 'cursor-pointer hover:bg-surface-2/60' : ''}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="shrink-0 font-mono text-[11px] text-text-muted">{dateLabel}</span>
        <span className="truncate">
          {displayTransactionConcept(tx.concept)}
          {(hasInvoice || hasAttachment) && (
            <a
              href={tx.attachments?.[0] ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 inline-flex text-text-faint hover:text-brand"
              onClick={(e) => e.stopPropagation()}
            >
              <Paperclip className="h-3 w-3" />
            </a>
          )}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Badge tone="gray" color={tx.category.color} className="hidden sm:inline-flex">{tx.category.name}</Badge>
        <span className="shrink-0">
          <Money
            amount={isIncome ? tx.amount : -tx.amount}
            currency={tx.currency}
            variant="inline"
            className={isIncome ? 'text-brand' : ''}
          />
        </span>
        {hasInvoice && (
          <ChevronRight className="h-4 w-4 text-text-faint shrink-0" />
        )}
      </div>
    </div>
  )
}

const PERIOD_TABS: { value: DashboardPeriod; label: string }[] = [
  { value: 'this-month', label: 'Monthly' },
  { value: 'this-week', label: 'Weekly' },
  { value: 'quarter', label: 'Quarterly' },
  { value: 'semester', label: 'Semester' },
  { value: 'year', label: 'Yearly' },
  { value: 'all', label: 'All time' },
]

function PeriodTabs({ value, onChange }: { value: DashboardPeriod; onChange: (v: DashboardPeriod) => void }) {
  return (
    <Segmented
      value={value}
      onChange={(id) => onChange(id as DashboardPeriod)}
      options={PERIOD_TABS.map((tab) => ({ id: tab.value, label: tab.label }))}
    />
  )
}
