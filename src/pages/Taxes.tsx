import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/lib/api'
import {
  Landmark,
  Calculator,
  ShieldCheck,
  ShieldX,
  CalendarDays,
  PiggyBank,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/common/Badge'
import {
  calculateTaxObligation,
  calculateSimpleTax,
  calculateProvision,
  getPaymentCalendar,
  getUVT,
  type SimpleTaxResult,
} from '@/lib/tax-co'

const CURRENT_YEAR = new Date().getFullYear()

function formatCop(amount: number): string {
  return `$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount)}`
}

function formatCopFull(amount: number): string {
  return `$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount)} COP`
}

export default function TaxesPage() {
  const api = useApi()

  const { data: transactionsData, isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => api.get<any[]>('/transactions'),
  })

  const transactions = transactionsData ?? []

  const yearStart = `${CURRENT_YEAR}-01-01`
  const yearEnd = `${CURRENT_YEAR}-12-31`

  const annualIncomeCop = useMemo(() => {
    if (!transactions) return 0
    return transactions
      .filter(tx => tx.type === 'income' && tx.date >= yearStart && tx.date <= yearEnd)
      .reduce((sum, tx) => sum + (tx.amountInSecondary || 0), 0)
  }, [transactions, yearStart, yearEnd])

  const uvt = getUVT(CURRENT_YEAR)
  const obligation = calculateTaxObligation(annualIncomeCop, CURRENT_YEAR)
  const simpleTax = calculateSimpleTax(annualIncomeCop, CURRENT_YEAR)
  const provision = calculateProvision(annualIncomeCop)
  const calendar = getPaymentCalendar(CURRENT_YEAR)

  const loading = isLoading

  return (
    <>
      <PageHeader
        title={
          <>
            Taxes · <em className="font-serif italic">Colombia</em>
          </>
        }
        subtitle="DIAN tax obligation tracking"
      />

      {loading ? (
        <div className="py-10 text-center text-text-muted">Loading…</div>
      ) : (
        <div className="space-y-6">
          {/* Row 1: UVT + Annual Income + Obligation */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoCard
              icon={Landmark}
              iconTone="brand"
              title={`UVT ${CURRENT_YEAR}`}
              value={formatCop(uvt)}
              subtitle="Tax Value Unit"
            />
            <InfoCard
              icon={TrendingUp}
              iconTone="brand"
              title={`Gross income ${CURRENT_YEAR}`}
              value={formatCopFull(annualIncomeCop)}
              subtitle={`"Income" transactions this year · ${(annualIncomeCop / uvt).toFixed(1)} UVT`}
            />
            <ObligationCard obligation={obligation} income={annualIncomeCop} />
          </div>

          {/* Row 2: Régimen Simple */}
          <SimpleTaxSection result={simpleTax} income={annualIncomeCop} uvt={uvt} />

          {/* Row 3: Provision + Calendar */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Provision */}
            <div className="rounded-[10px] border border-border bg-surface p-5">
              <div className="mb-4 flex items-center gap-2">
                <PiggyBank className="h-4 w-4 text-gold" strokeWidth={1.8} />
                <h3 className="text-[13px] font-medium">Suggested provision</h3>
              </div>
              <p className="mb-3 text-[12px] text-text-muted">
                Recommended monthly reserve at 2% of your gross annual income.
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-text-muted">Annual provision</span>
                  <span className="font-mono font-medium">{formatCopFull(provision)}</span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-text-muted">Monthly provision</span>
                  <span className="font-mono font-medium">{formatCopFull(Math.round(provision / 12))}</span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-text-muted">Bimonthly provision</span>
                  <span className="font-mono font-medium">{formatCopFull(Math.round(provision / 6))}</span>
                </div>
              </div>
            </div>

            {/* Payment Calendar */}
            <div className="rounded-[10px] border border-border bg-surface p-5">
              <div className="mb-4 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-info" strokeWidth={1.8} />
                <h3 className="text-[13px] font-medium">Bimonthly calendar {CURRENT_YEAR}</h3>
              </div>
              <div className="space-y-2">
                {calendar.map((period, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-md bg-surface-2/40 px-3 py-2 text-[13px]"
                  >
                    <span className="font-medium">{period.label}</span>
                    <span className="text-text-muted">{period.months}</span>
                    <span className="text-text-muted">Due: {period.dueMonth}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* DIAN Thresholds Reference */}
          <div className="rounded-[10px] border border-border bg-surface p-5">
            <div className="mb-3 flex items-center gap-2">
              <Calculator className="h-4 w-4 text-text-muted" strokeWidth={1.8} />
              <h3 className="text-[13px] font-medium">DIAN thresholds · Reference</h3>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ThresholdCard
                label="Income tax filing required"
                uvt={1400}
                cop={obligation.declareThresholdCop}
                exceeded={obligation.mustDeclare}
              />
              <ThresholdCard
                label="Invoicing required"
                uvt={3500}
                cop={obligation.invoiceThresholdCop}
                exceeded={obligation.mustInvoice}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function InfoCard({
  icon: Icon,
  iconTone,
  title,
  value,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  iconTone: 'brand' | 'warm' | 'gold' | 'danger' | 'info'
  title: string
  value: string
  subtitle: string
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
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] text-text-muted">{title}</span>
        <Icon className={toneClass[iconTone]} strokeWidth={1.8} />
      </div>
      <div className="font-mono text-[20px] font-medium">{value}</div>
      <div className="mt-1 text-[11px] text-text-muted">{subtitle}</div>
    </div>
  )
}

function ObligationCard({
  obligation,
  income,
}: {
  obligation: ReturnType<typeof calculateTaxObligation>
  income: number
}) {
  if (income === 0) {
    return (
      <div className="rounded-[10px] border border-border bg-surface p-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[12px] text-text-muted">Tax obligation</span>
          <AlertTriangle className="h-4 w-4 text-text-muted" strokeWidth={1.8} />
        </div>
        <div className="text-[14px] font-medium text-text-muted">
          No income recorded
        </div>
        <div className="mt-1 text-[11px] text-text-muted">
          Record income to calculate your tax obligation
        </div>
      </div>
    )
  }

  const none = !obligation.mustDeclare && !obligation.mustInvoice

  return (
    <div className="rounded-[10px] border border-border bg-surface p-5">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] text-text-muted">Tax obligation</span>
        {none ? (
          <ShieldCheck className="h-4 w-4 text-brand" strokeWidth={1.8} />
        ) : (
          <ShieldX className="h-4 w-4 text-warm" strokeWidth={1.8} />
        )}
      </div>
      <div className="space-y-1.5">
        <ObligationRow label="File income tax" active={obligation.mustDeclare} />
        <ObligationRow label="Invoice" active={obligation.mustInvoice} />
      </div>
      {none && (
        <div className="mt-2 text-[11px] text-brand">
          Your income is below DIAN thresholds
        </div>
      )}
    </div>
  )
}

function ObligationRow({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center gap-2 text-[13px]">
      <Badge tone={active ? 'warm' : 'green'}>
        {active ? 'Required' : 'Not required'}
      </Badge>
      <span className="text-text-muted">{label}</span>
    </div>
  )
}

function SimpleTaxSection({
  result,
  income,
  uvt,
}: {
  result: SimpleTaxResult
  income: number
  uvt: number
}) {
  if (income === 0) {
    return null
  }

  const incomeUvt = income / uvt
  const maxBracketUvt = 5000

  return (
    <div className="rounded-[10px] border border-border bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-brand" strokeWidth={1.8} />
          <h3 className="text-[13px] font-medium">Simple Tax Regime (SIMPLE)</h3>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-text-muted">Estimated tax</div>
          <div className="font-mono text-[16px] font-medium">{formatCopFull(result.totalTaxCop)}</div>
        </div>
      </div>

      {/* Effective rate */}
      <div className="mb-4 rounded-md bg-surface-2/40 px-3 py-2">
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-text-muted">Effective rate</span>
          <span className="font-mono font-medium">{(result.effectiveRate * 100).toFixed(2)}%</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-[12px]">
          <span className="text-text-muted">Income in UVT</span>
          <span className="font-mono">{incomeUvt.toFixed(1)} UVT</span>
        </div>
      </div>

      {/* Bracket breakdown */}
      <div className="space-y-3">
        {result.taxByBracket.map((bracket, i) => {
          const widthPct = Math.min(100, (bracket.taxableUvt / maxBracketUvt) * 100)
          const bracketColors = [
            'var(--brand)',
            'var(--brand)',
            'var(--warm)',
            'var(--danger)',
          ]
          const color = bracketColors[i] ?? 'var(--warm)'

          return (
            <div key={i}>
              <div className="mb-1 flex items-center justify-between text-[12px]">
                <span className="text-text-muted">
                  {bracket.from.toLocaleString()} – {bracket.to === Infinity ? '∞' : bracket.to.toLocaleString()} UVT
                  <span className="ml-1.5 text-text-faint">({(bracket.rate * 100).toFixed(1)}%)</span>
                </span>
                <span className="font-mono">{formatCop(bracket.taxCop)}</span>
              </div>
              <div className="h-2 rounded-full bg-surface-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{ width: `${Math.max(widthPct, 2)}%`, backgroundColor: color }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ThresholdCard({
  label,
  uvt,
  cop,
  exceeded,
}: {
  label: string
  uvt: number
  cop: number
  exceeded: boolean
}) {
  return (
    <div className="rounded-md bg-surface-2/40 px-4 py-3">
      <div className="mb-1 flex items-center gap-2">
        <Badge tone={exceeded ? 'danger' : 'green'}>
          {exceeded ? 'Supera el tope' : 'Debajo del tope'}
        </Badge>
      </div>
      <div className="text-[13px] font-medium">{label}</div>
      <div className="mt-1 space-y-0.5 text-[12px] text-text-muted">
        <div>Threshold: {uvt.toLocaleString()} UVT = {formatCopFull(cop)}</div>
      </div>
    </div>
  )
}
