import { useState, useMemo } from 'react'
import type { TitheConfig } from '@/types/domain'
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/lib/api'
import {
  Shield,
  Heart,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Save,
  X,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { Money } from '@/components/common/Money'
import { Badge } from '@/components/common/Badge'
import { toast } from 'sonner'
import { useSettings } from '@/hooks/useSettings'
import { calculateTitheForIncome } from '@/lib/tithe'

export default function TithePage() {
  const { settings, setSetting } = useSettings()
  const [editingConfig, setEditingConfig] = useState(false)
  const [editValues, setEditValues] = useState<Record<string, string>>({})

  const now = new Date()
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd')

  const api = useApi()

  const { data: transactions } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => api.get<any[]>('/transactions'),
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<any[]>('/categories'),
  })

  const categories = categoriesData ?? []

  const categoryMap = useMemo(() => {
    const m = new Map<number, typeof categories[number]>()
    for (const c of categories) {
      if (c.id != null) m.set(c.id, c)
    }
    return m
  }, [categories])

  const incomeCategories = categories.filter(c => c.type === 'income')

  const monthTxs = useMemo(() => {
    if (!transactions) return []
    return transactions.filter(tx => tx.date >= monthStart && tx.date <= monthEnd)
  }, [transactions, monthStart, monthEnd])

  const incomeTxs = monthTxs.filter(tx => tx.type === 'income')
  const titheOfferingTxs = monthTxs.filter(tx => {
    const cat = categoryMap.get(tx.categoryId)
    return cat?.name === 'Diezmo' || cat?.name === 'Ofrendas'
  })

  const totalIncome = incomeTxs.reduce((s, tx) => s + tx.amountInBase, 0)
  const totalIncomeCop = incomeTxs.reduce((s, tx) => s + tx.amountInSecondary, 0)

  let totalCalculatedTithe = 0
  let totalCalculatedOffering = 0
  const categoryBreakdown = new Map<number, { income: number; tithe: number; offering: number }>()

  // breakdown for the current month
  for (const tx of incomeTxs) {
    const result = calculateTitheForIncome(tx.amountInBase, tx.categoryId, settings ?? undefined)
    totalCalculatedTithe += result.tithe
    totalCalculatedOffering += result.offering

    const existing = categoryBreakdown.get(tx.categoryId) ?? { income: 0, tithe: 0, offering: 0 }
    existing.income += tx.amountInBase
    existing.tithe += result.tithe
    existing.offering += result.offering
    categoryBreakdown.set(tx.categoryId, existing)
  }

  // Global pending calculation
  let totalHistoricalTitheCalculated = 0
  let totalHistoricalTithePaid = 0
  if (settings && transactions) {
    const startDate = settings.titheStartDate || '1970-01-01'
    const kpiTxs = transactions.filter(tx => tx.type !== 'transfer' && tx.date >= startDate)
    
    for (const tx of kpiTxs.filter(tx => tx.type === 'income')) {
      const result = calculateTitheForIncome(tx.amountInBase, tx.categoryId, settings)
      totalHistoricalTitheCalculated += result.tithe + result.offering
    }
    const titheCatIds = new Set(categories.filter(c => c.name === 'Diezmo' || c.name === 'Ofrendas').map(c => c.id))
    for (const tx of kpiTxs.filter(tx => tx.categoryId != null && titheCatIds.has(tx.categoryId))) {
      totalHistoricalTithePaid += tx.amountInBase
    }
  }

  const totalCommitted = totalCalculatedTithe + totalCalculatedOffering
  const totalReturned = titheOfferingTxs.reduce((s, tx) => s + tx.amountInBase, 0)
  const pending = Math.max(0, (settings?.titheCarryoverUsd ?? 0) + totalHistoricalTitheCalculated - totalHistoricalTithePaid)

  const titheConfig = settings?.titheConfig

  function startEditing() {
    const values: Record<string, string> = {}
    for (const cat of incomeCategories) {
      const cfg = titheConfig?.tithePercentByIncomeCategory?.[cat.id!]
      values[`tithe_${cat.id}`] = String(cfg?.tithe ?? titheConfig?.defaultTithe ?? 10)
      values[`offering_${cat.id}`] = String(cfg?.offering ?? titheConfig?.defaultOffering ?? 0)
    }
    values.defaultTithe = String(titheConfig?.defaultTithe ?? 10)
    values.defaultOffering = String(titheConfig?.defaultOffering ?? 0)
    values.destination = titheConfig?.destination ?? 'Iglesia local'
    setEditValues(values)
    setEditingConfig(true)
  }

  async function saveConfig() {
    try {
      const newConfig: TitheConfig = {
        defaultTithe: Number(editValues.defaultTithe) || 10,
        defaultOffering: Number(editValues.defaultOffering) || 0,
        destination: editValues.destination || 'Iglesia local',
        tithePercentByIncomeCategory: {},
      }
      for (const cat of incomeCategories) {
        const t = Number(editValues[`tithe_${cat.id}`])
        const o = Number(editValues[`offering_${cat.id}`])
        if (t !== newConfig.defaultTithe || o !== newConfig.defaultOffering) {
          newConfig.tithePercentByIncomeCategory[cat.id!] = { tithe: t, offering: o }
        }
      }
      await setSetting('titheConfig', newConfig)
      setEditingConfig(false)
    } catch {
      toast.error('No se pudo guardar la configuración')
    }
  }

  const loading = transactions === undefined || !settings

  return (
    <>
      <PageHeader
        title={
          <>
            <em className="font-serif italic">Diezmo</em> & Ofrendas
          </>
        }
        subtitle='"Porque el Señor tu Dios es quien te da el poder para hacer las riquezas" · Dt 8:18'
      />

      {loading ? (
        <div className="py-10 text-center text-text-muted">Cargando…</div>
      ) : totalIncome === 0 ? (
        <EmptyState
          title="Sin ingresos este mes"
          description="Registra ingresos para ver el cálculo de diezmos y ofrendas"
          icon={<TrendingUp className="h-8 w-8 text-text-faint" />}
        />
      ) : (
        <div className="space-y-8">
          {/* Section 1: Month Summary */}
          <section>
            <h3 className="mb-3 text-[11px] uppercase tracking-[0.08em] text-text-muted">
              {format(now, 'MMMM yyyy', { locale: es })}
            </h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <SummaryCard
                icon={<TrendingUp className="h-4 w-4" />}
                iconTone="brand"
                label="Ingresos"
                amount={totalIncome}
                secondary={totalIncomeCop}
                currency="USD"
              />
              <SummaryCard
                icon={<Shield className="h-4 w-4" />}
                iconTone="gold"
                label="Diezmo calculado"
                amount={totalCalculatedTithe}
                currency="USD"
              />
              <SummaryCard
                icon={<Heart className="h-4 w-4" />}
                iconTone="warm"
                label="Ofrendas calculadas"
                amount={totalCalculatedOffering}
                currency="USD"
              />
              <SummaryCard
                icon={<AlertCircle className="h-4 w-4" />}
                iconTone="info"
                label="Total comprometido"
                amount={totalCommitted}
                currency="USD"
              />
              <SummaryCard
                icon={<CheckCircle2 className="h-4 w-4" />}
                iconTone="green"
                label="Ya entregado"
                amount={totalReturned}
                currency="USD"
              />
              <SummaryCard
                icon={<Clock className="h-4 w-4" />}
                iconTone={pending > 0 ? 'danger' : 'green'}
                label="Pendiente"
                amount={pending}
                currency="USD"
              />
            </div>
          </section>

          {/* Section 2: Breakdown by category */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[11px] uppercase tracking-[0.08em] text-text-muted">
                Desglose por categoría
              </h3>
              {!editingConfig ? (
                <button
                  type="button"
                  onClick={startEditing}
                  className="inline-flex items-center gap-1 text-[12px] text-text-muted hover:text-text"
                >
                  <Pencil className="h-3 w-3" /> Configurar
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={saveConfig}
                    className="inline-flex items-center gap-1 text-[12px] text-brand hover:text-brand/80"
                  >
                    <Save className="h-3 w-3" /> Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingConfig(false)}
                    className="inline-flex items-center gap-1 text-[12px] text-text-muted hover:text-text"
                  >
                    <X className="h-3 w-3" /> Cancelar
                  </button>
                </div>
              )}
            </div>
            <div className="overflow-x-auto rounded-lg border border-border bg-surface">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-border text-[11px] uppercase tracking-[0.06em] text-text-faint">
                    <th className="px-4 py-2 font-medium">Categoría</th>
                    <th className="px-4 py-2 text-right font-medium">Ingreso</th>
                    <th className="px-4 py-2 text-center font-medium">Diezmo %</th>
                    <th className="px-4 py-2 text-center font-medium">Ofrenda %</th>
                    <th className="px-4 py-2 text-right font-medium">Diezmo</th>
                    <th className="px-4 py-2 text-right font-medium">Ofrenda</th>
                  </tr>
                </thead>
                <tbody>
                  {incomeCategories.filter(c => categoryBreakdown.has(c.id!)).map(cat => {
                    const breakdown = categoryBreakdown.get(cat.id!)!
                    const cfg = titheConfig?.tithePercentByIncomeCategory?.[cat.id!]
                    const tithePct = cfg?.tithe ?? titheConfig?.defaultTithe ?? 10
                    const offeringPct = cfg?.offering ?? titheConfig?.defaultOffering ?? 0

                    return (
                      <tr key={cat.id} className="border-b border-border/30">
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                            {cat.name}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right font-mono">
                          USD {breakdown.income.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {editingConfig ? (
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              value={editValues[`tithe_${cat.id}`] ?? tithePct}
                              onChange={e => setEditValues(v => ({ ...v, [`tithe_${cat.id}`]: e.target.value }))}
                              className="w-16 rounded border border-border px-2 py-0.5 text-center font-mono text-[13px]"
                            />
                          ) : (
                            <span className="font-mono">{tithePct}%</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {editingConfig ? (
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              value={editValues[`offering_${cat.id}`] ?? offeringPct}
                              onChange={e => setEditValues(v => ({ ...v, [`offering_${cat.id}`]: e.target.value }))}
                              className="w-16 rounded border border-border px-2 py-0.5 text-center font-mono text-[13px]"
                            />
                          ) : (
                            <span className="font-mono">{offeringPct}%</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right font-mono">
                          USD {breakdown.tithe.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2 text-right font-mono">
                          USD {breakdown.offering.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border font-medium">
                    <td className="px-4 py-2">Total</td>
                    <td className="px-4 py-2 text-right font-mono">
                      USD {totalIncome.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                    </td>
                    <td colSpan={2} />
                    <td className="px-4 py-2 text-right font-mono">
                      USD {totalCalculatedTithe.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">
                      USD {totalCalculatedOffering.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {editingConfig && (
              <div className="mt-3 flex flex-wrap items-center gap-4 text-[12px] text-text-muted">
                <span>
                  Diezmo por defecto:
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={editValues.defaultTithe ?? ''}
                    onChange={e => setEditValues(v => ({ ...v, defaultTithe: e.target.value }))}
                    className="ml-1 w-14 rounded border border-border px-2 py-0.5 text-center font-mono text-[13px]"
                  />%
                </span>
                <span>
                  Ofrenda por defecto:
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={editValues.defaultOffering ?? ''}
                    onChange={e => setEditValues(v => ({ ...v, defaultOffering: e.target.value }))}
                    className="ml-1 w-14 rounded border border-border px-2 py-0.5 text-center font-mono text-[13px]"
                  />%
                </span>
                <span>
                  Destino:
                  <input
                    type="text"
                    value={editValues.destination ?? ''}
                    onChange={e => setEditValues(v => ({ ...v, destination: e.target.value }))}
                    className="ml-1 w-36 rounded border border-border px-2 py-0.5 text-[13px]"
                  />
                </span>
              </div>
            )}
          </section>

          {/* Section 3: History */}
          {titheOfferingTxs.length > 0 && (
            <section>
              <h3 className="mb-3 text-[11px] uppercase tracking-[0.08em] text-text-muted">
                Historial del mes
              </h3>
              <div className="rounded-lg border border-border bg-surface">
                {titheOfferingTxs.map(tx => {
                  const cat = categoryMap.get(tx.categoryId)
                  let dateLabel = '—'
                  if (tx.date) {
                    const d = parseISO(tx.date)
                    if (!isNaN(d.getTime())) dateLabel = format(d, 'dd MMM', { locale: es })
                  }
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between border-b border-border/30 px-4 py-2.5 last:border-b-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="shrink-0 font-mono text-[12px] text-text-muted">{dateLabel}</span>
                        <span className="truncate text-[13px]">{tx.concept}</span>
                        <Badge tone={cat?.name === 'Diezmo' ? 'gold' : 'warm'}>
                          {cat?.name ?? '—'}
                        </Badge>
                      </div>
                      <Money amount={tx.amount} currency={tx.currency} variant="inline" className="shrink-0 font-mono text-[13px]" />
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  )
}

const TONE_CLASSES: Record<string, string> = {
  brand: 'text-brand',
  warm: 'text-warm',
  gold: 'text-gold',
  danger: 'text-danger-strong',
  info: 'text-info',
  green: 'text-brand',
}

function SummaryCard({ icon, iconTone, label, amount, secondary, currency }: {
  icon: React.ReactNode
  iconTone: 'brand' | 'warm' | 'gold' | 'danger' | 'info' | 'green'
  label: string
  amount: number
  secondary?: number
  currency: 'USD' | 'COP' | 'EUR'
}) {
  return (
    <div className="rounded-[10px] border border-border bg-surface p-4">
      <div className="mb-2 flex items-center gap-1.5">
        <span className={TONE_CLASSES[iconTone]}>{icon}</span>
        <span className="text-[11px] text-text-muted">{label}</span>
      </div>
      <div className="font-mono text-[16px] font-medium">
        {currency} {amount.toLocaleString('es-CO', { minimumFractionDigits: currency !== 'COP' ? 2 : 0 })}
      </div>
      {secondary != null && secondary > 0 && (
        <div className="mt-0.5 font-mono text-[11px] text-text-muted">
          ~${secondary.toLocaleString('es-CO')} COP
        </div>
      )}
    </div>
  )
}
