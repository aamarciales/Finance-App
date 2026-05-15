import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useApi } from '@/lib/api'

interface ImportJsonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ParsedPreview {
  filename: string
  invoiceCount: number
  invoiceItemCount: number
  looseTxCount: number
  debtCount: number
  customCatCount: number
  data: unknown
}

export function ImportJsonDialog({ open, onOpenChange }: ImportJsonDialogProps) {
  const api = useApi()
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [preview, setPreview] = useState<ParsedPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  function reset() {
    setPreview(null)
    setError(null)
    setImporting(false)
    setConfirmed(false)
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null)
    setPreview(null)
    setConfirmed(false)

    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.json')) {
      setError('El archivo debe ser .json')
      return
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(await file.text())
    } catch {
      setError('El archivo no es JSON válido')
      return
    }

    const obj = parsed as Record<string, unknown>
    if (typeof obj !== 'object' || obj === null) {
      setError('El JSON no tiene la estructura esperada')
      return
    }

    const hasTx = Array.isArray(obj.transactions) && obj.transactions.length > 0
    const hasInv = Array.isArray(obj.invoices) && obj.invoices.length > 0
    const hasDebts = Array.isArray(obj.debts) && obj.debts.length > 0
    if (!hasTx && !hasInv && !hasDebts) {
      setError('El JSON no tiene datos para importar (transactions, invoices, debts)')
      return
    }

    // Bug H prevention: check for COP with trm<=1
    const txRows = (obj.transactions ?? []) as Array<Record<string, unknown>>
    const invRows = (obj.invoices ?? []) as Array<Record<string, unknown>>
    const badCopTx = txRows.some((tx) => tx.currency === 'COP' && (!tx.trm || Number(tx.trm) <= 1))
    const badCopInv = invRows.some((inv) => inv.currency === 'COP' && (!inv.trm || Number(inv.trm) <= 1))
    if (badCopTx || badCopInv) {
      setError('Algunas transacciones/facturas COP tienen TRM inválida (<=1). Corrige el JSON antes de importar.')
      return
    }

    const invoiceItemCount = invRows.reduce((sum, inv) => sum + ((inv.items as unknown[]) ?? []).length, 0)

    setPreview({
      filename: file.name,
      invoiceCount: invRows.length,
      invoiceItemCount,
      looseTxCount: txRows.length,
      debtCount: (obj.debts as unknown[])?.length ?? 0,
      customCatCount: ((obj.categories as unknown[]) ?? []).length,
      data: parsed,
    })
  }

  async function handleImport() {
    if (!preview) return
    setImporting(true)
    toast.loading('Importando datos...', { id: 'import-bulk' })

    try {
      const result = await api.post<{
        success: boolean
        counts?: { looseTransactions: number; invoices: number; invoiceItems: number; debts: number }
        error?: string
      }>('/admin/import-bulk', preview.data)

      toast.dismiss('import-bulk')

      if (result.success) {
        const c = result.counts!
        toast.success(
          `Importadas ${c.looseTransactions} tx, ${c.invoices} facturas (${c.invoiceItems} ítems), ${c.debts} deudas`,
        )
        await queryClient.invalidateQueries()
        handleOpenChange(false)
      } else {
        toast.error(result.error ?? 'Error desconocido en el import')
      }
    } catch (err) {
      toast.dismiss('import-bulk')
      toast.error(err instanceof Error ? err.message : 'Error al importar')
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importar datos desde JSON</DialogTitle>
          <DialogDescription>
            Selecciona un archivo JSON generado por la exportación o el parser de CSV.
          </DialogDescription>
        </DialogHeader>

        {!preview ? (
          <div
            className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-10 cursor-pointer hover:border-accent/40 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-8 w-8 text-text-muted" />
            <p className="text-[13px] text-text-muted">Click para elegir archivo .json</p>
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFile}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg bg-surface-2 px-4 py-3 text-[13px] space-y-1">
              <p className="font-medium">{preview.filename}</p>
              <ul className="text-text-muted space-y-0.5">
                {preview.invoiceCount > 0 && (
                  <li>{preview.invoiceCount} facturas con {preview.invoiceItemCount} ítems</li>
                )}
                {preview.looseTxCount > 0 && (
                  <li>{preview.looseTxCount} transacciones sueltas</li>
                )}
                {preview.debtCount > 0 && (
                  <li>{preview.debtCount} deudas</li>
                )}
                {preview.customCatCount > 0 && (
                  <li>{preview.customCatCount} categorías custom</li>
                )}
              </ul>
            </div>

            <div className="rounded-lg border border-danger-strong/30 bg-danger-strong/5 px-4 py-3 text-[13px] text-danger-strong">
              Esto BORRA todos tus datos actuales y los reemplaza con el contenido del archivo.
            </div>

            <label className="flex items-start gap-2 text-[13px] cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 accent-accent"
              />
              <span>Entiendo que esto borra mis datos actuales</span>
            </label>
          </div>
        )}

        {error && (
          <p className="text-[13px] text-danger-strong">{error}</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={importing}>
            Cancelar
          </Button>
          {preview && (
            <Button
              variant="destructive"
              onClick={handleImport}
              disabled={!confirmed || importing}
            >
              {importing ? 'Importando...' : 'Importar y reemplazar'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
