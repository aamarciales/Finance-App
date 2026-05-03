import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Wallet, TrendingUp, TrendingDown, Heart, ArrowRight,
  Paperclip, ChevronRight, Banknote,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Money } from '@/components/common/Money'
import { Badge } from '@/components/common/Badge'
import { KpiCard } from '@/components/kpi/KpiCard'
import { ExpensesByCategory } from '@/components/charts/ExpensesByCategory'
import { MonthlyTrend } from '@/components/charts/MonthlyTrend'
import { useDashboard, type EnrichedTransaction } from '@/hooks/useDashboard'
import { useSettings } from '@/hooks/useSettings'
import type { BadgeTone } from '@/components/common/Badge'

const CATEGORY_TONE_MAP: Record<string, BadgeTone> = {
  Supermercado: 'green', 'Comida fuera': 'gold', Transporte: 'warm',
  Servicios: 'info', Salud: 'info', 'Educación': 'info', Hogar: 'gray',
  Diezmo: 'gold', Ofrendas: 'gold', Deuda: 'danger', Impuestos: 'gray',
  Otros: 'gray', Freelance: 'green', Sueldo: 'green', 'Otros ingresos': 'gray',
  Transferencias: 'gray', 'Comisiones bancarias': 'warm', 'Intereses bancarios': 'danger',
  Mercado: 'green', Prestamo: 'gray', Perdida: 'danger', Adelanto: 'green',
  'Cobro Deuda': 'green', Suscripciones: 'info', Mascotas: 'gray', Teléfono: 'warm',
  Iglesia: 'gold', Vivienda: 'gray',
}

export default function DashboardPage() {
  const { settings } = useSettings()
  const data = useDashboard()

  const now = new Date()
  const hour = now.getHours()
  const greeting =
    hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'
  const monthLabel = format(now, "LLLL yyyy", { locale: es })
  const month = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)
  const name = settings?.displayName ?? 'tú'

  function formatCop(amount: number): string {
    return `$${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(amount)} COP`
  }

  return (
    <>
      <PageHeader
        title={
          <>
            {greeting}, <em className="not-italic font-serif italic text-brand">{name}</em>.
          </>
        }
        subtitle={`${month} · Resumen del mes en curso`}
      />

      {data.loading ? (
        <div className="py-10 text-center text-text-muted">Cargando…</div>
      ) : (
      <div className="space-y-6">
        {/* Insight Banner */}
        {data.insight && <InsightBanner insight={data.insight} formatCop={formatCop} />}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <KpiCard
            label="Balance total"
            amount={data.totalBalance}
            currency="USD"
            secondary={formatCop(data.totalBalanceCop)}
            icon={Wallet}
            tone={data.totalBalance >= 0 ? 'brand' : 'danger'}
          />
          <KpiCard
            label="Ingresos del mes"
            amount={data.monthIncome}
            currency="USD"
            secondary={formatCop(data.monthIncomeCop)}
            icon={TrendingUp}
            tone="brand"
          />
          <KpiCard
            label="Gastos del mes"
            amount={data.monthExpenses}
            currency="USD"
            secondary={formatCop(data.monthExpensesCop)}
            icon={TrendingDown}
            tone="warm"
          />
          <KpiCard
            label="Diezmo pendiente"
            amount={data.tithePending}
            currency="USD"
            icon={Heart}
            tone="gold"
          />
          <KpiCard
            label="Capital disponible"
            amount={data.availableCapitalCop}
            currency="COP"
            secondary={data.availableCapital > 0 ? `USD ${data.availableCapital.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : undefined}
            icon={Banknote}
            tone="brand"
          />
        </div>

        {/* Row 2: Cash Flow + Tithe Card */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
          <MonthlyTrend data={data.monthlyTrend} />
          <TitheCard breakdown={data.titheBreakdown} formatCop={formatCop} />
        </div>

        {/* Section title */}
        <div className="text-[11px] uppercase tracking-[0.1em] text-text-faint">
          Movimientos recientes
        </div>

        {/* Row 3: Transactions + Category chart */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
          {/* Transactions card */}
          <div className="rounded-[10px] border border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border px-6 py-3">
              <div>
                <div className="text-[15px] font-medium font-serif">Transacciones</div>
                <div className="text-[11px] text-text-faint font-mono">
                  {data.recentTransactions.length} últimas
                </div>
              </div>
              <Link
                to="/transactions"
                className="inline-flex items-center gap-1 text-[12px] text-text-muted transition-colors hover:text-brand"
              >
                Ver todas <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {data.recentTransactions.length === 0 ? (
              <div className="px-6 py-8 text-center text-[13px] text-text-muted">
                Sin transacciones registradas
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
    </>
  )
}

function InsightBanner({ insight, formatCop }: { insight: NonNullable<ReturnType<typeof useDashboard>['insight']>; formatCop: (n: number) => string }) {
  return (
    <div
      className="relative overflow-hidden rounded-[10px] px-6 py-[22px]"
      style={{ background: 'linear-gradient(135deg, #1a3a2e 0%, #2d4a3e 100%)' }}
    >
      <div
        className="absolute -right-10 -top-10 h-44 w-44 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)' }}
      />
      <div className="relative">
        <div className="mb-1.5 text-[10.5px] uppercase tracking-[0.14em]" style={{ color: 'rgba(240,237,228,0.6)' }}>
          Observación del mes
        </div>
        <div className="font-serif text-[19px] font-normal leading-[1.35] tracking-[-0.01em]" style={{ color: '#f0ede4' }}>
          {insight.text}{' '}
          <em className="italic" style={{ color: '#d4c693' }}>{formatCop(insight.savingsCop)}</em>
          {' '}al cierre del mes.
        </div>
      </div>
    </div>
  )
}

function TitheCard({ breakdown, formatCop }: { breakdown: ReturnType<typeof useDashboard>['titheBreakdown']; formatCop: (n: number) => string }) {
  if (breakdown.byCategory.length === 0) return null

  return (
    <div
      className="rounded-[10px] p-[22px_24px]"
      style={{
        background: 'linear-gradient(160deg, #fbf7ed 0%, #f5ecd3 100%)',
        border: '1px solid var(--gold-soft)',
      }}
    >
      <div className="mb-4">
        <div className="font-serif text-[17px] font-medium">Diezmo & Ofrendas</div>
        <div className="font-mono text-[11.5px] text-text-faint">Pendiente de devolver / entregar</div>
      </div>

      {breakdown.byCategory.map((cat) => (
        <div
          key={cat.name}
          className="flex items-baseline justify-between py-2.5 text-[13px]"
          style={{ borderTop: '1px dashed rgba(184,146,58,0.3)' }}
        >
          <span className="text-text-muted">
            <strong className="font-medium text-text">{cat.name}</strong>{' '}
            · {cat.tithePct}% + {cat.offeringPct}%
          </span>
          <span className="font-mono text-[13px] font-medium text-gold">
            USD {cat.tithe.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
          </span>
        </div>
      ))}

      {/* Totals */}
      <div
        className="mt-3.5 flex items-baseline justify-between rounded-md px-3.5 py-3"
        style={{ background: 'rgba(184,146,58,0.12)' }}
      >
        <span className="text-[11px] uppercase tracking-[0.08em] text-text-muted">Total a apartar</span>
        <span className="font-serif text-[20px] italic text-gold">
          {formatCop(breakdown.totalCop)}
        </span>
      </div>

      <div
        className="mt-3.5 border-t pt-3.5 text-[11.5px] italic leading-[1.55] text-text-muted"
        style={{ borderColor: 'rgba(184,146,58,0.2)' }}
      >
        "Traed todos los diezmos al alfolí…" — Cada ingreso registrado calcula automáticamente lo que pertenece al Señor.
      </div>
    </div>
  )
}

function DashboardTxRow({ tx }: { tx: EnrichedTransaction }) {
  const isIncome = tx.type === 'income'
  const dateLabel = format(parseISO(tx.date), 'dd MMM', { locale: es })
  const tone = CATEGORY_TONE_MAP[tx.category.name] ?? 'gray'
  const hasInvoice = !!tx.invoiceId
  const hasAttachment = !!(tx.attachmentIds && tx.attachmentIds.length > 0)

  return (
    <div
      className={`flex items-center justify-between px-6 py-2.5 text-[13px] border-b border-border/30 last:border-b-0 transition-colors ${hasInvoice ? 'cursor-pointer hover:bg-surface-2/60' : ''}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="shrink-0 font-mono text-[11px] text-text-muted">{dateLabel}</span>
        <span className="truncate">
          {tx.concept}
          {(hasInvoice || hasAttachment) && (
            <Paperclip className="ml-1 inline h-3 w-3 text-text-faint" />
          )}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Badge tone={tone} className="hidden sm:inline-flex">{tx.category.name}</Badge>
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
