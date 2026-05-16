import { useState, useMemo } from 'react'
import type { TitheConfig } from '@/types/domain'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { useQuery } from '@tanstack/react-query'
import {
  Shield,
  TrendingUp,
  Clock,
  CheckCircle2,
  Pencil,
  Save,
  X,
  HandCoins,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { useSettings } from '@/hooks/useSettings'
import { useApi } from '@/lib/api'
import { useQueryClient } from '@tanstack/react-query'
import { useTRM } from '@/hooks/useTRM'
import { useTitheCommitments } from '@/hooks/useTitheCommitments'
import { TithePaymentDialog } from '@/components/tithe/TithePaymentDialog'
import { TitheDebtPaymentDialog } from '@/components/tithe/TitheDebtPaymentDialog'
import { ComplianceChart } from '@/components/tithe/ComplianceChart'

export default function TithePage() {
  const { settings, setSetting } = useSettings()
  const { rate: trm } = useTRM()
  const api = useApi()
  const queryClient = useQueryClient()
  const {
    pendingCommitments,
    payments,
    pendingSummary,
    monthlyCompliance,
    titheDebtUsd,
    loading,
    registerPayment,
    registerDebtPayment,
    linkExistingTransaction,
  } = useTitheCommitments()

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [debtPaymentOpen, setDebtPaymentOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState(false)
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [generating, setGenerating] = useState(false)

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { useApi } = await import('@/lib/api')
      return useApi().get<any[]>('/categories')
    },
  })
  const categories = categoriesData ?? []
  const incomeCategories = categories.filter((c: any) => c.type === 'income')
  const diezmoCatIds = useMemo(() => {
    const ids = new Set<number>()
    for (const c of categories) {
      if (c.name === 'Diezmo' || c.name === 'Diezmo y Ofrenda' || c.name === 'Ofrendas' || c.name === 'Ofrenda') {
        if (c.id) ids.add(c.id)
      }
    }
    return ids
  }, [categories])

  // Fetch transactions to find unlinked diezmo/ofrenda expenses
  const { data: txData } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => api.get<any[]>('/transactions'),
  })

  // Get payment transaction IDs that are already linked
  const linkedTxIds = useMemo(() => {
    const ids = new Set<number>()
    for (const p of payments) {
      if (p.transactionId) ids.add(p.transactionId)
    }
    return ids
  }, [payments])

  // Unlinked diezmo/ofrenda expense transactions
  const unlinkedTxs = useMemo(() => {
    if (!txData) return []
    return txData.filter((tx: any) =>
      (tx.type === 'expense' || tx.type === 'debt_payment') &&
      diezmoCatIds.has(tx.categoryId) &&
      !linkedTxIds.has(tx.id)
    )
  }, [txData, diezmoCatIds, linkedTxIds])

  const [linkingTxId, setLinkingTxId] = useState<number | null>(null)

  const titheConfig = settings?.titheConfig

  async function handleGenerateCommitments() {
    setGenerating(true)
    try {
      const result = await api.post<{ created: number }>('/admin/generate-commitments', {})
      toast.success(`${result.created} compromisos generados`)
      await queryClient.invalidateQueries({ queryKey: ['tithe-commitments'] })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error generando compromisos')
    } finally {
      setGenerating(false)
    }
  }

  function toggleCommitment(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selectedIds.size === pendingCommitments.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(pendingCommitments.map(c => c.id!)))
    }
  }

  const selectedCommitments = useMemo(
    () => pendingCommitments.filter(c => selectedIds.has(c.id!)),
    [pendingCommitments, selectedIds],
  )

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

  if (loading || !settings) {
    return (
      <>
        <PageHeader title={<><em className="font-serif italic">Diezmo</em> & Ofrendas</>} subtitle="…" />
        <div className="py-10 text-center text-text-muted">Cargando…</div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={<><em className="font-serif italic">Diezmo</em> & Ofrendas</>}
        subtitle='"Porque el Señor tu Dios es quien te da el poder para hacer las riquezas" · Dt 8:18'
        actions={
          pendingCommitments.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                if (selectedCommitments.length === 0) {
                  toast.error('Selecciona al menos un compromiso')
                  return
                }
                setPaymentOpen(true)
              }}
              disabled={registerPayment.isPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-gold px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-gold/90 disabled:opacity-50"
            >
              <HandCoins className="h-4 w-4" />
              Registrar entrega ({selectedCommitments.length || '0'})
            </button>
          ) : undefined
        }
      />

      <div className="space-y-8">
        {/* Summary cards */}
        <section>
          <h3 className="mb-3 text-[11px] uppercase tracking-[0.08em] text-text-muted">
            Resumen
          </h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <SummaryCard
              icon={<TrendingUp className="h-4 w-4" />}
              iconTone="brand"
              label="Compromisos pendientes"
              amount={pendingSummary.totalPending}
              count={pendingSummary.pendingCount}
            />
            <SummaryCard
              icon={<CheckCircle2 className="h-4 w-4" />}
              iconTone="green"
              label="Total entregado"
              amount={pendingSummary.totalPaid}
            />
            <SummaryCard
              icon={<Clock className="h-4 w-4" />}
              iconTone={pendingSummary.totalPending > 0 ? 'gold' : 'green'}
              label="Deuda espiritual"
              amount={titheDebtUsd}
            />
            <SummaryCard
              icon={<Shield className="h-4 w-4" />}
              iconTone="brand"
              label="TRM hoy"
              amount={trm}
              noDecimals
            />
          </div>
        </section>

        {/* Pending commitments */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[11px] uppercase tracking-[0.08em] text-text-muted">
              Compromisos pendientes
            </h3>
            {pendingCommitments.length > 0 && (
              <label className="flex items-center gap-1.5 text-[12px] text-text-muted cursor-pointer">
                <Checkbox
                  checked={selectedIds.size === pendingCommitments.length && pendingCommitments.length > 0}
                  onCheckedChange={toggleAll}
                />
                Seleccionar todos
              </label>
            )}
          </div>

          {pendingCommitments.length === 0 ? (
            <div className="rounded-[10px] border border-border bg-surface px-6 py-8 text-center text-[13px] text-text-muted">
              No hay compromisos pendientes. Los compromisos se generan automáticamente con cada ingreso.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border bg-surface">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-border text-[11px] uppercase tracking-[0.06em] text-text-faint">
                    <th className="w-10 px-3 py-2" />
                    <th className="px-3 py-2 font-medium">Fecha</th>
                    <th className="px-3 py-2 font-medium">Concepto</th>
                    <th className="px-3 py-2 text-right font-medium">Ingreso</th>
                    <th className="px-3 py-2 text-center font-medium">%</th>
                    <th className="px-3 py-2 text-right font-medium">A apartar</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingCommitments.map(c => {
                    const copEquivalent = Math.round(c.totalAmount * c.incomeTrm)
                    return (
                      <tr
                        key={c.id}
                        className={`border-b border-border/30 transition-colors ${selectedIds.has(c.id!) ? 'bg-surface-2/60' : ''}`}
                      >
                        <td className="px-3 py-2">
                          <Checkbox
                            checked={selectedIds.has(c.id!)}
                            onCheckedChange={() => toggleCommitment(c.id!)}
                          />
                        </td>
                        <td className="px-3 py-2 font-mono text-[12px] text-text-muted">
                          {format(parseISO(c.date), 'dd MMM', { locale: es })}
                        </td>
                        <td className="px-3 py-2 truncate max-w-[140px]">
                          {c.incomeConcept || '—'}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          <div>USD {c.incomeAmountBase.toFixed(2)}</div>
                          {c.incomeCurrency !== 'USD' && c.incomeOriginalAmount > 0 && (
                            <div className="text-[11px] text-text-muted">{c.incomeCurrency} {c.incomeOriginalAmount.toLocaleString('es-CO')}</div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center font-mono text-[12px]">
                          {c.tithePercent}+{c.offeringPercent}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-medium">
                          <div>USD {c.totalAmount.toFixed(2)}</div>
                          <div className="text-[11px] text-text-muted">${copEquivalent.toLocaleString('es-CO')} COP</div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border font-medium bg-surface-2/40">
                    <td className="px-3 py-2" />
                    <td className="px-3 py-2" colSpan={4}>Total seleccionado</td>
                    <td className="px-3 py-2 text-right font-mono">
                      USD {selectedCommitments.reduce((s, c) => s + c.totalAmount, 0).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>

        {/* Unlinked diezmo/ofrenda transactions */}
        {unlinkedTxs.length > 0 && (
          <section>
            <h3 className="mb-3 text-[11px] uppercase tracking-[0.08em] text-text-muted">
              Transacciones sin vincular
            </h3>
            <p className="mb-3 text-[12px] text-text-muted">
              Estas transacciones de diezmo/ofrenda no están asociadas a ningún compromiso. Haz click en "Vincular" para marcar compromisos como pagados.
            </p>
            <div className="space-y-2">
              {unlinkedTxs.map((tx: any) => {
                const dateLabel = tx.date ? format(parseISO(tx.date), 'dd MMM yyyy', { locale: es }) : '—'
                const cat = categories.find((c: any) => c.id === tx.categoryId)
                const isLinking = linkingTxId === tx.id
                return (
                  <div key={tx.id} className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="shrink-0 font-mono text-[12px] text-text-muted">{dateLabel}</span>
                      <span className="truncate text-[13px]">{tx.concept}</span>
                      {cat && (
                        <span
                          className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium"
                          style={{ backgroundColor: cat.color + '20', color: cat.color }}
                        >
                          {cat.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[13px] font-medium shrink-0">
                        {tx.currency} {tx.amount.toLocaleString('es-CO', { minimumFractionDigits: tx.currency !== 'COP' ? 2 : 0 })}
                      </span>
                      {isLinking ? (
                        <span className="text-[12px] text-brand">Selecciona compromisos arriba ↑</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setLinkingTxId(tx.id)
                            // Select all pending commitments by default
                            setSelectedIds(new Set(pendingCommitments.map(c => c.id!)))
                          }}
                          className="rounded-md bg-brand/10 px-3 py-1 text-[12px] font-medium text-brand transition-colors hover:bg-brand/20"
                        >
                          Vincular
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            {linkingTxId && (
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setLinkingTxId(null)}
                  className="mr-2 rounded-md border border-border px-3 py-1.5 text-[12px] text-text-muted"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={selectedIds.size === 0 || linkExistingTransaction.isPending}
                  onClick={async () => {
                    try {
                      await linkExistingTransaction.mutateAsync({
                        transactionId: linkingTxId,
                        commitmentIds: [...selectedIds],
                      })
                      toast.success(`${selectedIds.size} compromiso${selectedIds.size > 1 ? 's' : ''} vinculado${selectedIds.size > 1 ? 's' : ''}`)
                      setLinkingTxId(null)
                      setSelectedIds(new Set())
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : 'Error al vincular')
                    }
                  }}
                  className="rounded-md bg-brand px-4 py-1.5 text-[12px] font-medium text-white disabled:opacity-50"
                >
                  {linkExistingTransaction.isPending ? 'Vinculando…' : `Confirmar vinculación (${selectedIds.size})`}
                </button>
              </div>
            )}
          </section>
        )}

        {/* Generate commitments for existing income */}
        {pendingCommitments.length === 0 && (
          <section>
            <div className="rounded-[10px] border border-dashed border-border bg-surface px-6 py-6 text-center">
              <p className="text-[13px] text-text-muted mb-3">
                No hay compromisos pendientes. Si tienes ingresos previos, genera sus compromisos automáticamente.
              </p>
              <button
                type="button"
                onClick={handleGenerateCommitments}
                disabled={generating}
                className="inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-brand/90 disabled:opacity-50"
              >
                {generating ? 'Generando…' : 'Generar compromisos de ingresos existentes'}
              </button>
            </div>
          </section>
        )}

        {/* Payment History */}
        {payments.length > 0 && (
          <section>
            <h3 className="mb-3 text-[11px] uppercase tracking-[0.08em] text-text-muted">
              Historial de entregas
            </h3>
            <div className="rounded-lg border border-border bg-surface">
              {payments.map(p => {
                const dateLabel = p.date ? format(parseISO(p.date), 'dd MMM yyyy', { locale: es }) : '—'
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between border-b border-border/30 px-4 py-2.5 last:border-b-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="shrink-0 font-mono text-[12px] text-text-muted">{dateLabel}</span>
                      <span className="truncate text-[13px]">{p.paidTo}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[13px] font-medium">
                        USD {p.amountUsd.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                      </span>
                      {p.amountCop && (
                        <span className="font-mono text-[11px] text-text-muted">
                          ${p.amountCop.toLocaleString('es-CO')} COP
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Spiritual Debt */}
        {titheDebtUsd > 0 && (
          <section>
            <h3 className="mb-3 text-[11px] uppercase tracking-[0.08em] text-text-muted">
              Deuda espiritual
            </h3>
            <div
              className="rounded-[10px] p-[22px_24px]"
              style={{
                background: 'linear-gradient(160deg, #fbf7ed 0%, #f5ecd3 100%)',
                border: '1px solid var(--gold-soft)',
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-serif text-[17px] font-medium">Deuda histórica</div>
                  <div className="font-mono text-[11.5px] text-text-faint">
                    Saldo anterior a la app
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-serif text-[22px] italic text-gold">
                    USD {titheDebtUsd.toFixed(2)}
                  </div>
                  <div className="font-mono text-[11px] text-text-muted">
                    ~${Math.round(titheDebtUsd * trm).toLocaleString('es-CO')} COP
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setDebtPaymentOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-gold/90 px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-gold"
                >
                  <HandCoins className="h-3.5 w-3.5" />
                  Registrar abono
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Compliance Chart */}
        {monthlyCompliance.length > 0 && (
          <section>
            <h3 className="mb-3 text-[11px] uppercase tracking-[0.08em] text-text-muted">
              Cumplimiento mensual
            </h3>
            <div className="rounded-[10px] border border-border bg-surface p-5">
              <ComplianceChart data={monthlyCompliance} />
              <div className="mt-2 flex items-center justify-center gap-4 text-[10px] text-text-faint">
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-brand" /> 100%</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-gold" /> 50-99%</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-danger-strong" /> &lt;50%</span>
              </div>
            </div>
          </section>
        )}

        {/* Config section */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[11px] uppercase tracking-[0.08em] text-text-muted">
              Configuración
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

          {/* Default config */}
          {editingConfig && (
            <div className="mb-3 flex flex-wrap items-center gap-4 text-[12px] text-text-muted">
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

          {/* Per-category breakdown */}
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-[0.06em] text-text-faint">
                  <th className="px-4 py-2 font-medium">Categoría</th>
                  <th className="px-4 py-2 text-center font-medium">Diezmo %</th>
                  <th className="px-4 py-2 text-center font-medium">Ofrenda %</th>
                </tr>
              </thead>
              <tbody>
                {incomeCategories.map((cat: any) => {
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
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Dialogs */}
      <TithePaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        commitments={selectedCommitments}
        trm={trm}
        onSubmit={(data) => registerPayment.mutateAsync(data)}
      />

      <TitheDebtPaymentDialog
        open={debtPaymentOpen}
        onOpenChange={setDebtPaymentOpen}
        remainingDebt={titheDebtUsd}
        trm={trm}
        onSubmit={(data) => registerDebtPayment.mutateAsync(data)}
      />
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

function SummaryCard({ icon, iconTone, label, amount, count, noDecimals }: {
  icon: React.ReactNode
  iconTone: 'brand' | 'warm' | 'gold' | 'danger' | 'info' | 'green'
  label: string
  amount: number
  count?: number
  noDecimals?: boolean
}) {
  return (
    <div className="rounded-[10px] border border-border bg-surface p-4">
      <div className="mb-2 flex items-center gap-1.5">
        <span className={TONE_CLASSES[iconTone]}>{icon}</span>
        <span className="text-[11px] text-text-muted">{label}</span>
      </div>
      <div className="font-mono text-[16px] font-medium">
        {noDecimals
          ? amount.toLocaleString('es-CO')
          : `USD ${amount.toLocaleString('es-CO', { minimumFractionDigits: 2 })}`}
      </div>
      {count != null && count > 0 && (
        <div className="mt-0.5 text-[11px] text-text-muted">{count} pendiente{count !== 1 ? 's' : ''}</div>
      )}
    </div>
  )
}
