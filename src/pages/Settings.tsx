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
      toast.success('Settings saved')
    } catch {
      toast.error('Could not save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !local) {
    return (
      <>
        <PageHeader title="Settings" subtitle="Personal settings and preferences" />
        <div className="py-10 text-center text-text-muted">Loading…</div>
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
    toast.success('Export complete')
  }

  async function handleClear() {
    try {
      await api.post('/admin/wipe-my-data', {})
      await api.post('/admin/seed-system-categories', {})
      await queryClient.invalidateQueries()
      setConfirmClear(false)
      setLocal(null)
      toast.success('Data deleted and system categories restored')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete data')
    }
  }

  const freeCatId = categories?.find(c => c.name === 'Freelance')?.id ?? 0
  const sueldoCatId = categories?.find(c => c.name === 'Sueldo')?.id ?? 0

  return (
    <>
      <PageHeader title="Settings" subtitle="Personal settings and preferences" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Section 1: Currencies */}
        <div className="rounded-[10px] border border-border bg-surface p-5">
          <div className="mb-4">
            <h3 className="text-[15px] font-medium">Currencies</h3>
            <p className="mt-1 text-[12.5px] text-text-muted">Configure your currencies and exchange-rate source</p>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldGroup label="Base currency">
                <Select
                  value={local.baseCurrency}
                  onValueChange={(v) => updateLocal('baseCurrency', v as Currency)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD — US dollar</SelectItem>
                    <SelectItem value="COP">COP — Peso col.</SelectItem>
                    <SelectItem value="EUR">EUR — Euro</SelectItem>
                  </SelectContent>
                </Select>
              </FieldGroup>
              <FieldGroup label="Secondary currency">
                <Select
                  value={local.secondaryCurrency}
                  onValueChange={(v) => updateLocal('secondaryCurrency', v as Currency)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COP">COP — Peso col.</SelectItem>
                    <SelectItem value="USD">USD — US dollar</SelectItem>
                    <SelectItem value="EUR">EUR — Euro</SelectItem>
                  </SelectContent>
                </Select>
              </FieldGroup>
            </div>
            <FieldGroup label="FX rate source">
              <Select value="banrep" onValueChange={() => {}} disabled>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="banrep">Bank of the Republic (Banrep)</SelectItem>
                </SelectContent>
              </Select>
            </FieldGroup>
          </div>
        </div>

        {/* Section: Capital disponible */}
        <div className="rounded-[10px] border border-border bg-surface p-5">
          <div className="mb-4">
            <h3 className="text-[15px] font-medium">Available capital</h3>
            <p className="mt-1 text-[12.5px] text-text-muted">Bank accounts and cash. The total appears on the Dashboard.</p>
          </div>
          <div className="space-y-3">
            {(local.capitalAccounts ?? []).map((acc, idx) => (
              <div key={acc.id} className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-end">
                <FieldGroup label={idx === 0 ? 'Name' : undefined}>
                  <Input
                    value={acc.name}
                    onChange={(e) => {
                      const accounts = [...(local.capitalAccounts ?? [])]
                      accounts[idx] = { ...accounts[idx], name: e.target.value }
                      updateLocal('capitalAccounts', accounts)
                    }}
                    placeholder="e.g. Bancolombia"
                  />
                </FieldGroup>
                <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                  <FieldGroup label={idx === 0 ? 'Amount' : undefined}>
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
                  <FieldGroup label={idx === 0 ? 'Currency' : undefined}>
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
              Add account
            </Button>
            <Button
              onClick={handleSave}
              disabled={!dirty || saving}
              className="w-full gap-1.5"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </div>

        {/* Section 2: Diezmo & Ofrendas */}
        <div className="rounded-[10px] border border-border bg-surface p-5">
          <div className="mb-4">
            <h3 className="text-[15px] font-medium">Tithe & offerings</h3>
            <p className="mt-1 text-[12.5px] text-text-muted">Set tithe and offering percentages by income type</p>
          </div>
          <div className="space-y-4">
            <FieldGroup label="Church / destination">
              <Input
                value={local.titheConfig.destination}
                onChange={(e) => {
                  updateLocal('titheConfig', { ...local.titheConfig, destination: e.target.value })
                }}
                placeholder="Local church"
              />
            </FieldGroup>

            {/* Stepper grid — single 3-col layout so Diezmo/Ofrenda align across rows */}
            <div className="grid grid-cols-[minmax(5rem,auto)_1fr_1fr] items-center gap-x-4 gap-y-3">
              <span className="text-[11px] uppercase tracking-[0.06em] text-text-muted">Type</span>
              <span className="text-center text-[11px] uppercase tracking-[0.06em] text-text-muted">Tithe</span>
              <span className="text-center text-[11px] uppercase tracking-[0.06em] text-text-muted">Offering</span>

              <span className="text-[13px]">Freelance</span>
              <div className="flex justify-center">
                <StepperInput
                  value={local.titheConfig.tithePercentByIncomeCategory[freeCatId]?.tithe ?? local.titheConfig.defaultTithe}
                  onChange={(v) => updateTitheCategory(freeCatId, 'tithe', v)}
                />
              </div>
              <div className="flex justify-center">
                <StepperInput
                  value={local.titheConfig.tithePercentByIncomeCategory[freeCatId]?.offering ?? local.titheConfig.defaultOffering}
                  onChange={(v) => updateTitheCategory(freeCatId, 'offering', v)}
                />
              </div>

              <span className="text-[13px]">Salary</span>
              <div className="flex justify-center">
                <StepperInput
                  value={local.titheConfig.tithePercentByIncomeCategory[sueldoCatId]?.tithe ?? local.titheConfig.defaultTithe}
                  onChange={(v) => updateTitheCategory(sueldoCatId, 'tithe', v)}
                />
              </div>
              <div className="flex justify-center">
                <StepperInput
                  value={local.titheConfig.tithePercentByIncomeCategory[sueldoCatId]?.offering ?? local.titheConfig.defaultOffering}
                  onChange={(v) => updateTitheCategory(sueldoCatId, 'offering', v)}
                />
              </div>
            </div>

            {/* Save button */}
            <Button
              onClick={handleSave}
              disabled={!dirty || saving}
              className="w-full gap-1.5"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </div>

        {/* Section 3: Smart import */}
        <div className="rounded-[10px] border border-border bg-surface p-5">
          <div className="mb-4">
            <h3 className="text-[15px] font-medium">Smart import</h3>
            <p className="mt-1 text-[12.5px] text-text-muted">Configure OCR and auto-categorization</p>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldGroup label="OCR processing">
                <Select
                  value={local.ocrProvider}
                  onValueChange={(v) => updateLocal('ocrProvider', v as OcrProvider)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="gemini">Google Gemini</SelectItem>
                    <SelectItem value="claude">Claude AI</SelectItem>
                    <SelectItem value="off">Off</SelectItem>
                  </SelectContent>
                </Select>
              </FieldGroup>
              <FieldGroup label="Auto-categorization">
                <Select
                  value={local.autoCategorize ? 'auto' : 'manual'}
                  onValueChange={(v) => updateLocal('autoCategorize', v === 'auto')}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Automatic</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </FieldGroup>
            </div>
            {(local.ocrProvider === 'gemini' || local.ocrProvider === 'openai') && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {local.ocrProvider === 'openai' && (
                  <FieldGroup label="OpenAI API key">
                    <Input
                      type="password"
                      value={local.openaiApiKey ?? ''}
                      onChange={(e) => updateLocal('openaiApiKey', e.target.value || undefined)}
                      placeholder="sk-..."
                    />
                  </FieldGroup>
                )}
                {local.ocrProvider === 'gemini' && (
                  <FieldGroup label="Google Gemini API key">
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
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </div>

        {/* Section 4: Data & privacy */}
        <div className="rounded-[10px] border border-border bg-surface p-5">
          <div className="mb-4">
            <h3 className="text-[15px] font-medium">Data & privacy</h3>
            <p className="mt-1 text-[12.5px] text-text-muted">Your data is stored securely in the cloud and synced across devices.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="gap-1.5" onClick={handleExport}>
              <Download className="h-4 w-4" /> Export JSON
            </Button>
            <Button variant="outline" className="gap-1.5" onClick={() => setImportOpen(true)}>
              <FileUp className="h-4 w-4" /> Import JSON
            </Button>
            <Button variant="outline" className="gap-1.5 text-danger-strong hover:text-danger-strong" onClick={() => setConfirmClear(true)}>
              <Trash2 className="h-4 w-4" /> Delete data
            </Button>
          </div>
        </div>
      </div>

      {/* Clear data confirmation */}
      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all transactions, invoices, debts, goals, and settings.
              This cannot be undone. Export your data first if you need a backup.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClear}>Delete all</AlertDialogAction>
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
