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
      setError('File must be .json')
      return
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(await file.text())
    } catch {
      setError('File is not valid JSON')
      return
    }

    const obj = parsed as Record<string, unknown>
    if (typeof obj !== 'object' || obj === null) {
      setError('JSON does not have the expected structure')
      return
    }

    const hasTx = Array.isArray(obj.transactions) && obj.transactions.length > 0
    const hasInv = Array.isArray(obj.invoices) && obj.invoices.length > 0
    const hasDebts = Array.isArray(obj.debts) && obj.debts.length > 0
    if (!hasTx && !hasInv && !hasDebts) {
      setError('JSON has no data to import (transactions, invoices, debts)')
      return
    }

    // Bug H prevention: check for COP with trm<=1
    const txRows = (obj.transactions ?? []) as Array<Record<string, unknown>>
    const invRows = (obj.invoices ?? []) as Array<Record<string, unknown>>
    const badCopTx = txRows.some((tx) => tx.currency === 'COP' && (!tx.trm || Number(tx.trm) <= 1))
    const badCopInv = invRows.some((inv) => inv.currency === 'COP' && (!inv.trm || Number(inv.trm) <= 1))
    if (badCopTx || badCopInv) {
      setError('Some COP transactions/invoices have invalid FX rate (<=1). Fix the JSON before importing.')
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
    toast.loading('Importing data...', { id: 'import-bulk' })

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
          `Imported ${c.looseTransactions} tx, ${c.invoices} invoices (${c.invoiceItems} items), ${c.debts} debts`,
        )
        await queryClient.invalidateQueries()
        handleOpenChange(false)
      } else {
        toast.error(result.error ?? 'Unknown import error')
      }
    } catch (err) {
      toast.dismiss('import-bulk')
      toast.error(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import data from JSON</DialogTitle>
          <DialogDescription>
            Select a JSON file from export or the CSV parser.
          </DialogDescription>
        </DialogHeader>

        {!preview ? (
          <div
            className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-10 cursor-pointer hover:border-accent/40 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-8 w-8 text-text-muted" />
            <p className="text-[13px] text-text-muted">Click to choose a .json file</p>
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
                  <li>{preview.invoiceCount} invoices with {preview.invoiceItemCount} items</li>
                )}
                {preview.looseTxCount > 0 && (
                  <li>{preview.looseTxCount} standalone transactions</li>
                )}
                {preview.debtCount > 0 && (
                  <li>{preview.debtCount} debts</li>
                )}
                {preview.customCatCount > 0 && (
                  <li>{preview.customCatCount} custom categories</li>
                )}
              </ul>
            </div>

            <div className="rounded-lg border border-danger-strong/30 bg-danger-strong/5 px-4 py-3 text-[13px] text-danger-strong">
              This will DELETE all your current data and replace it with the file contents.
            </div>

            <label className="flex items-start gap-2 text-[13px] cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 accent-accent"
              />
              <span>I understand this will delete my current data</span>
            </label>
          </div>
        )}

        {error && (
          <p className="text-[13px] text-danger-strong">{error}</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={importing}>
            Cancel
          </Button>
          {preview && (
            <Button
              variant="destructive"
              onClick={handleImport}
              disabled={!confirmed || importing}
            >
              {importing ? 'Importing...' : 'Import and replace'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
