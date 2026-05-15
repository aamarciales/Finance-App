import { useState } from 'react'
import { toast } from 'sonner'
import { Download, Trash2, FileUp } from 'lucide-react'
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
import { useQueryClient } from '@tanstack/react-query'
import { useSettings } from '@/hooks/useSettings'
import { useApi } from '@/lib/api'
import { ImportJsonDialog } from '@/components/settings/ImportJsonDialog'
import type { Currency, OcrProvider } from '@/types/domain'

export default function SettingsPage() {
  const { settings: rawSettings, loading, setSetting } = useSettings()
  const [confirmClear, setConfirmClear] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const api = useApi()
  const queryClient = useQueryClient()

  const settings = rawSettings!

  if (loading || !settings) {
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
      toast.success('Datos eliminados y categorías sistema restauradas')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al borrar los datos')
    }
  }

  function updateTitheCategory(catId: number, field: 'tithe' | 'offering', value: number) {
    const existing = settings.titheConfig.tithePercentByIncomeCategory[catId]
    setSetting('titheConfig', {
      ...settings.titheConfig,
      tithePercentByIncomeCategory: {
        ...settings.titheConfig.tithePercentByIncomeCategory,
        [catId]: {
          tithe: field === 'tithe' ? value : (existing?.tithe ?? settings.titheConfig.defaultTithe),
          offering: field === 'offering' ? value : (existing?.offering ?? settings.titheConfig.defaultOffering),
        },
      },
    })
  }

  const freeCatId = getFreelanceCatId()
  const sueldoCatId = getSueldoCatId()

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
                  value={settings.baseCurrency}
                  onValueChange={(v) => setSetting('baseCurrency', v as Currency)}
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
                  value={settings.secondaryCurrency}
                  onValueChange={(v) => setSetting('secondaryCurrency', v as Currency)}
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

        {/* Section 2: Diezmo & Ofrendas */}
        <div className="rounded-[10px] border border-border bg-surface p-5">
          <div className="mb-4">
            <h3 className="text-[15px] font-medium">Diezmo & Ofrendas</h3>
            <p className="mt-1 text-[12.5px] text-text-muted">Configura los porcentajes por tipo de ingreso</p>
          </div>
          <div className="space-y-4">
            <FieldGroup label="Iglesia / Destino">
              <Input
                value={settings.titheConfig.destination}
                onChange={(e) => {
                  setSetting('titheConfig', { ...settings.titheConfig, destination: e.target.value })
                }}
                placeholder="Iglesia local"
              />
            </FieldGroup>

            {/* Grid 2x3 with headers */}
            <div className="grid grid-cols-3 gap-3 items-center">
              <div></div>
              <Label className="text-center text-[11px] text-text-muted">Diezmo %</Label>
              <Label className="text-center text-[11px] text-text-muted">Ofrenda %</Label>

              <Label className="text-[13px]">Freelance</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                className="text-center"
                value={settings.titheConfig.tithePercentByIncomeCategory[freeCatId]?.tithe ?? settings.titheConfig.defaultTithe}
                onChange={(e) => updateTitheCategory(freeCatId, 'tithe', Number(e.target.value))}
              />
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                className="text-center"
                value={settings.titheConfig.tithePercentByIncomeCategory[freeCatId]?.offering ?? settings.titheConfig.defaultOffering}
                onChange={(e) => updateTitheCategory(freeCatId, 'offering', Number(e.target.value))}
              />

              <Label className="text-[13px]">Sueldo</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                className="text-center"
                value={settings.titheConfig.tithePercentByIncomeCategory[sueldoCatId]?.tithe ?? settings.titheConfig.defaultTithe}
                onChange={(e) => updateTitheCategory(sueldoCatId, 'tithe', Number(e.target.value))}
              />
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                className="text-center"
                value={settings.titheConfig.tithePercentByIncomeCategory[sueldoCatId]?.offering ?? settings.titheConfig.defaultOffering}
                onChange={(e) => updateTitheCategory(sueldoCatId, 'offering', Number(e.target.value))}
              />
            </div>
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
                  value={settings.ocrProvider}
                  onValueChange={(v) => setSetting('ocrProvider', v as OcrProvider)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="claude">Claude AI</SelectItem>
                    <SelectItem value="tesseract">Tesseract</SelectItem>
                    <SelectItem value="off">Desactivado</SelectItem>
                  </SelectContent>
                </Select>
              </FieldGroup>
              <FieldGroup label="Categorización automática">
                <Select
                  value={settings.autoCategorize ? 'auto' : 'manual'}
                  onValueChange={(v) => setSetting('autoCategorize', v === 'auto')}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Automática</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </FieldGroup>
            </div>
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

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-[12px]">{label}</Label>
      {children}
    </div>
  )
}

function getFreelanceCatId(): number {
  return 13 // Freelance category from seed
}

function getSueldoCatId(): number {
  return 14 // Sueldo category from seed
}
