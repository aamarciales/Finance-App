import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Download, Trash2, FileUp, Save, Plus } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { StepperInput } from '@/components/ui/stepper-input'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSettings } from '@/hooks/useSettings'
import { useApi } from '@/lib/api'
import { ImportJsonDialog } from '@/components/settings/ImportJsonDialog'
import type { AppSettings, CapitalAccount, Category, Currency, OcrProvider } from '@/types/domain'

export default function SettingsPage() {
  const { settings: serverSettings, loading, setSetting } = useSettings()
  const [confirmClear, setConfirmClear] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const api = useApi()
  const queryClient = useQueryClient()

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/categories'),
  })

  // Local state buffer
  const [local, setLocal] = useState<AppSettings | null>(null)

  useEffect(() => {
    if (serverSettings && !local) {
      setLocal(structuredClone(serverSettings))
    }
  }, [serverSettings, local])

  const dirty = local !== null && serverSettings !== null && JSON.stringify(local) !== JSON.stringify(serverSettings)

  const updateLocal = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setLocal(prev => prev ? { ...prev, [key]: value } : prev)
  }, [])

  function updateTitheCategory(catId: number, field: 'tithe' | 'offering', value: number) {
    if (!local) return
    const existing = local.titheConfig.tithePercentByIncomeCategory[catId]
    updateLocal('titheConfig', {
      ...local.titheConfig,
      tithePercentByIncomeCategory: {
        ...local.titheConfig.tithePercentByIncomeCategory,
        [catId]: {
          tithe: field === 'tithe' ? value : (existing?.tithe ?? local.titheConfig.defaultTithe),
          offering: field === 'offering' ? value : (existing?.offering ?? local.titheConfig.defaultOffering),
        },
      },
    })
  }

  async function handleSave() {
    if (!local || !serverSettings) return
    setSaving(true)
    try {
      // Find changed keys and save them
      const keys = Object.keys(local) as (keyof AppSettings)[]
      for (const key of keys) {
        if (JSON.stringify(local[key]) !== JSON.stringify(serverSettings[key])) {
          await setSetting(key, local[key])
        }
      }
      toast.success('Ajustes guardados')
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !local) {
    return (
      <>
        <PageHeader title="Ajustes" subtitle="Configuración personal y preferencias" />
        <div className="py-10 text-center text-text-muted">Cargando…</div>
      </>
    )
  }

  async function handleExport() {
    const data: Record<string, unknown> = {}
    const endpoints = ['transactions', 'categories', 'invoices', 'invoice-items', 'goals', 'debts', 'settings', 'tithe-payments'] as const
    const labels = ['transactions', 'categories', 'invoices', 'invoiceItems', 'goals', 'debts', 'settings', 'tithePayments'] as const

    for (let i = 0; i < endpoints.length; i++) {
      try {
        data[labels[i]] = await api.get(`/${endpoints[i]}`)
      } catch {
        data[labels[i]] = []
      }
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `patrimonio-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Exportación completada')
  }

  async function handleClear() {
    try {
      await api.post('/admin/wipe-my-data', {})
      await api.post('/admin/seed-system-categories', {})
      await queryClient.invalidateQueries()
      setConfirmClear(false)
      setLocal(null)
      toast.success('Datos eliminados y categorías sistema restauradas')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al borrar los datos')
    }
  }

  const freeCatId = categories?.find(c => c.name === 'Freelance')?.id ?? 0
  const sueldoCatId = categories?.find(c => c.name === 'Sueldo')?.id ?? 0

  return (
    <>
      <PageHeader title="Ajustes" subtitle="Configuración personal y preferencias" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Section 1: Monedas */}
        <div className="rounded-[10px] border border-border bg-surface p-5">
          <div className="mb-4">
            <h3 className="text-[15px] font-medium">Monedas</h3>
            <p className="mt-1 text-[12.5px] text-text-muted">Configura tus monedas y fuente de tasas de cambio</p>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldGroup label="Moneda base">
                <Select
                  value={local.baseCurrency}
                  onValueChange={(v) => updateLocal('baseCurrency', v as Currency)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD — Dólar</SelectItem>
                    <SelectItem value="COP">COP — Peso col.</SelectItem>
                    <SelectItem value="EUR">EUR — Euro</SelectItem>
                  </SelectContent>
                </Select>
              </FieldGroup>
              <FieldGroup label="Moneda secundaria">
                <Select
                  value={local.secondaryCurrency}
                  onValueChange={(v) => updateLocal('secondaryCurrency', v as Currency)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COP">COP — Peso col.</SelectItem>
                    <SelectItem value="USD">USD — Dólar</SelectItem>
                    <SelectItem value="EUR">EUR — Euro</SelectItem>
                  </SelectContent>
                </Select>
              </FieldGroup>
            </div>
            <FieldGroup label="Fuente TRM">
              <Select value="banrep" onValueChange={() => {}} disabled>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="banrep">Banco de la República</SelectItem>
                </SelectContent>
              </Select>
            </FieldGroup>
          </div>
        </div>

        {/* Section: Capital disponible */}
        <div className="rounded-[10px] border border-border bg-surface p-5">
          <div className="mb-4">
            <h3 className="text-[15px] font-medium">Capital disponible</h3>
            <p className="mt-1 text-[12.5px] text-text-muted">Cuentas bancarias y efectivo. El total se muestra en el Dashboard.</p>
          </div>
          <div className="space-y-3">
            {(local.capitalAccounts ?? []).map((acc, idx) => (
              <div key={acc.id} className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-end">
                <FieldGroup label={idx === 0 ? 'Nombre' : undefined}>
                  <Input
                    value={acc.name}
                    onChange={(e) => {
                      const accounts = [...(local.capitalAccounts ?? [])]
                      accounts[idx] = { ...accounts[idx], name: e.target.value }
                      updateLocal('capitalAccounts', accounts)
                    }}
                    placeholder="Ej. Bancolombia"
                  />
                </FieldGroup>
                <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                  <FieldGroup label={idx === 0 ? 'Monto' : undefined}>
                    <Input
                      type="number"
                      step="any"
                      className="font-mono"
                      value={acc.amount || ''}
                      onChange={(e) => {
                        const accounts = [...(local.capitalAccounts ?? [])]
                        accounts[idx] = { ...accounts[idx], amount: e.target.value ? Number(e.target.value) : 0 }
                        updateLocal('capitalAccounts', accounts)
                      }}
                      placeholder="0"
                    />
                  </FieldGroup>
                  <FieldGroup label={idx === 0 ? 'Moneda' : undefined}>
                    <Select
                      value={acc.currency}
                      onValueChange={(v) => {
                        const accounts = [...(local.capitalAccounts ?? [])]
                        accounts[idx] = { ...accounts[idx], currency: v as Currency }
                        updateLocal('capitalAccounts', accounts)
                      }}
                    >
                      <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="COP">COP</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldGroup>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-text-muted hover:text-danger-strong mb-0.5"
                  onClick={() => {
                    const accounts = (local.capitalAccounts ?? []).filter((_, i) => i !== idx)
                    updateLocal('capitalAccounts', accounts)
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                const accounts = [...(local.capitalAccounts ?? []), { id: crypto.randomUUID(), name: '', amount: 0, currency: local.baseCurrency } as CapitalAccount]
                updateLocal('capitalAccounts', accounts)
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar cuenta
            </Button>
            <Button
              onClick={handleSave}
              disabled={!dirty || saving}
              className="w-full gap-1.5"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </div>
        </div>

        {/* Section 2: Diezmo & Ofrendas */}
        <div className="rounded-[10px] border border-border bg-surface p-5">
          <div className="mb-4">
            <h3 className="text-[15px] font-medium">Diezmo & Ofrendas</h3>
            <p className="mt-1 text-[12.5px] text-text-muted">Configura los porcentajes por tipo de ingreso</p>
          </div>
          <div className="space-y-4">
            <FieldGroup label="Iglesia / Destino">
              <Input
                value={local.titheConfig.destination}
                onChange={(e) => {
                  updateLocal('titheConfig', { ...local.titheConfig, destination: e.target.value })
                }}
                placeholder="Iglesia local"
              />
            </FieldGroup>

            {/* Stepper grid */}
            <div className="space-y-3">
              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 items-center">
                <span className="text-[11px] uppercase tracking-[0.06em] text-text-muted w-16">Tipo</span>
                <div className="grid grid-cols-2 gap-3">
                  <span className="text-center text-[11px] uppercase tracking-[0.06em] text-text-muted">Diezmo</span>
                  <span className="text-center text-[11px] uppercase tracking-[0.06em] text-text-muted">Ofrenda</span>
                </div>
              </div>

              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-3 items-center">
                <span className="text-[13px]">Freelance</span>
                <div className="grid grid-cols-2 gap-3">
                  <StepperInput
                    value={local.titheConfig.tithePercentByIncomeCategory[freeCatId]?.tithe ?? local.titheConfig.defaultTithe}
                    onChange={(v) => updateTitheCategory(freeCatId, 'tithe', v)}
                  />
                  <StepperInput
                    value={local.titheConfig.tithePercentByIncomeCategory[freeCatId]?.offering ?? local.titheConfig.defaultOffering}
                    onChange={(v) => updateTitheCategory(freeCatId, 'offering', v)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-3 items-center">
                <span className="text-[13px]">Sueldo</span>
                <div className="grid grid-cols-2 gap-3">
                  <StepperInput
                    value={local.titheConfig.tithePercentByIncomeCategory[sueldoCatId]?.tithe ?? local.titheConfig.defaultTithe}
                    onChange={(v) => updateTitheCategory(sueldoCatId, 'tithe', v)}
                  />
                  <StepperInput
                    value={local.titheConfig.tithePercentByIncomeCategory[sueldoCatId]?.offering ?? local.titheConfig.defaultOffering}
                    onChange={(v) => updateTitheCategory(sueldoCatId, 'offering', v)}
                  />
                </div>
              </div>
            </div>

            {/* Save button */}
            <Button
              onClick={handleSave}
              disabled={!dirty || saving}
              className="w-full gap-1.5"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </div>
        </div>

        {/* Section 3: Importación inteligente */}
        <div className="rounded-[10px] border border-border bg-surface p-5">
          <div className="mb-4">
            <h3 className="text-[15px] font-medium">Importación inteligente</h3>
            <p className="mt-1 text-[12.5px] text-text-muted">Configura OCR y categorización automática</p>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldGroup label="Procesamiento OCR">
                <Select
                  value={local.ocrProvider}
                  onValueChange={(v) => updateLocal('ocrProvider', v as OcrProvider)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="gemini">Google Gemini</SelectItem>
                    <SelectItem value="claude">Claude AI</SelectItem>
                    <SelectItem value="off">Desactivado</SelectItem>
                  </SelectContent>
                </Select>
              </FieldGroup>
              <FieldGroup label="Categorización automática">
                <Select
                  value={local.autoCategorize ? 'auto' : 'manual'}
                  onValueChange={(v) => updateLocal('autoCategorize', v === 'auto')}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Automática</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </FieldGroup>
            </div>
            {(local.ocrProvider === 'gemini' || local.ocrProvider === 'openai') && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {local.ocrProvider === 'openai' && (
                  <FieldGroup label="API Key de OpenAI">
                    <Input
                      type="password"
                      value={local.openaiApiKey ?? ''}
                      onChange={(e) => updateLocal('openaiApiKey', e.target.value || undefined)}
                      placeholder="sk-..."
                    />
                  </FieldGroup>
                )}
                {local.ocrProvider === 'gemini' && (
                  <FieldGroup label="API Key de Google Gemini">
                    <Input
                      type="password"
                      value={local.geminiApiKey ?? ''}
                      onChange={(e) => updateLocal('geminiApiKey', e.target.value || undefined)}
                      placeholder="AIza..."
                    />
                  </FieldGroup>
                )}
              </div>
            )}

            <Button
              onClick={handleSave}
              disabled={!dirty || saving}
              className="w-full gap-1.5"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </div>
        </div>

        {/* Section 4: Datos & Privacidad */}
        <div className="rounded-[10px] border border-border bg-surface p-5">
          <div className="mb-4">
            <h3 className="text-[15px] font-medium">Datos & Privacidad</h3>
            <p className="mt-1 text-[12.5px] text-text-muted">Tus datos están almacenados de forma segura en la nube y sincronizados entre dispositivos.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="gap-1.5" onClick={handleExport}>
              <Download className="h-4 w-4" /> Exportar JSON
            </Button>
            <Button variant="outline" className="gap-1.5" onClick={() => setImportOpen(true)}>
              <FileUp className="h-4 w-4" /> Importar JSON
            </Button>
            <Button variant="outline" className="gap-1.5 text-danger-strong hover:text-danger-strong" onClick={() => setConfirmClear(true)}>
              <Trash2 className="h-4 w-4" /> Borrar datos
            </Button>
          </div>
        </div>
      </div>

      {/* Clear data confirmation */}
      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar todos los datos?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará todas las transacciones, facturas, deudas, metas y configuración.
              No se puede deshacer. Exporta tus datos primero si necesitas respaldo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClear}>Borrar todo</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImportJsonDialog open={importOpen} onOpenChange={setImportOpen} />
    </>
  )
}

function FieldGroup({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      {label && <Label className="text-[12px]">{label}</Label>}
      {children}
    </div>
  )
}
