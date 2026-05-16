import { useRef, useState, useMemo, useCallback } from 'react'
import { FileUp, HelpCircle, Upload, FileText, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@clerk/clerk-react'
import Papa from 'papaparse'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
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
import { useInvoices, type InvoiceFormData } from '@/hooks/useInvoices'
import { formatMoney } from '@/lib/format'
import type { Category, Currency } from '@/types/domain'

interface ParsedItem {
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
  subCategory?: string
  barcode?: string
}

interface ParsedCsv {
  invoiceNumber?: string
  date?: string
  issuer?: string
  items: ParsedItem[]
  currency: Currency
}

interface ImportCsvDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
  rates: { trm: number; eurToUsd: number }
}

function parseNumber(val: unknown): number {
  if (typeof val === 'number') return val
  if (!val) return 0
  const s = String(val).replace(/[$\s]/g, '')
  if (s.includes(',') && s.includes('.')) {
    const lastComma = s.lastIndexOf(',')
    const lastDot = s.lastIndexOf('.')
    if (lastComma > lastDot) return parseFloat(s.replace(/\./g, '').replace(',', '.'))
    return parseFloat(s.replace(/,/g, ''))
  }
  if (s.includes(',')) return parseFloat(s.replace(',', '.'))
  return parseFloat(s) || 0
}

function parseDate(val: string): string {
  if (!val) return new Date().toISOString().slice(0, 10)
  const d = new Date(val)
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  const parts = val.split(/[/-]/)
  if (parts.length === 3) {
    const [a, b, c] = parts.map(Number)
    if (c > 100) return `${c}-${String(b).padStart(2, '0')}-${String(a).padStart(2, '0')}`
    if (a > 100) return `${a}-${String(b).padStart(2, '0')}-${String(c).padStart(2, '0')}`
  }
  return new Date().toISOString().slice(0, 10)
}

function detectCsv(rows: Record<string, string>[]): ParsedCsv | null {
  if (rows.length === 0) return null
  const headers = Object.keys(rows[0]).map(h => h.trim().toLowerCase())

  const get = (row: Record<string, string>, ...names: string[]): string => {
    for (const n of names) {
      const key = Object.keys(row).find(k => k.trim().toLowerCase() === n.toLowerCase())
      if (key && row[key]) return row[key].trim()
    }
    return ''
  }

  const firstRow = rows[0]

  // Try service/utility bill format first (e.g. Claro, utilities)
  const isServiceBill = headers.some(h =>
    h.includes('proveedor') || h.includes('supplier') ||
    h.includes('monto total') || h.includes('total amount') ||
    h.includes('concepto') || h.includes('payment') || h.includes('pago')
  )
  const hasDescription = headers.some(h => h.includes('description') || h.includes('descripcion') || h.includes('producto'))

  if (isServiceBill && !hasDescription) {
    const issuer = get(firstRow, 'proveedor', 'supplier', 'empresa', 'company', 'merchant', 'comercio')
      || get(firstRow, 'issuer', 'tienda')
    const totalAmount = parseNumber(
      get(firstRow, 'monto total', 'total amount', 'total', 'monto', 'valor', 'amount', 'valor total')
    )
    const concept = get(firstRow, 'concepto', 'concept', 'descripcion', 'description', 'tipo')
    const date = get(firstRow, 'fecha transaccion', 'fecha transacción', 'transaction date',
      'fecha', 'date', 'issue date', 'fecha limite de pago', 'fecha límite de pago', 'due date')
    const invoiceNumber = get(firstRow, 'referencia o numero cuenta', 'referencia',
      'invoice number', 'numero factura', 'cuenta', 'reference')
    const currencyStr = get(firstRow, 'moneda', 'currency')

    if (totalAmount > 0 || issuer) {
      const currency: Currency = (currencyStr?.toUpperCase() === 'USD' ? 'USD' : currencyStr?.toUpperCase() === 'EUR' ? 'EUR' : 'COP')
      return {
        invoiceNumber,
        date: parseDate(date),
        issuer: issuer || 'Servicio',
        items: [{
          name: concept || `Pago ${issuer || 'servicio'}`,
          quantity: 1,
          unitPrice: totalAmount,
          totalPrice: totalAmount,
        }],
        currency,
      }
    }
  }

  // Product invoice format (supermarket, etc.)
  if (!hasDescription) return null

  const items: ParsedItem[] = []
  for (const row of rows) {
    const name = get(row, 'description', 'descripcion', 'producto')
    if (!name) continue

    const qty = parseNumber(get(row, 'qty', 'quantity', 'cantidad'))
    const unitPrice = parseNumber(get(row, 'unit price', 'precio unitario', 'precio'))
    const totalPrice = parseNumber(get(row, 'total item', 'total amount', 'total', 'subtotal'))
    const barcode = get(row, 'barcode', 'codigo', 'código de barras', 'ean')
    const subCat = get(row, 'category', 'subcategory', 'subcategoria', 'subcategoría')

    items.push({
      name,
      quantity: qty > 0 ? qty : 1,
      unitPrice: unitPrice > 0 ? unitPrice : (totalPrice > 0 && qty > 0 ? totalPrice / qty : 0),
      totalPrice: totalPrice > 0 ? totalPrice : unitPrice * (qty > 0 ? qty : 1),
      ...(barcode ? { barcode } : {}),
      ...(subCat ? { subCategory: subCat } : {}),
    })
  }

  if (items.length === 0) return null

  const invoiceNumber = get(firstRow, 'invoice number', 'numero factura', 'numero_factura')
  const date = get(firstRow, 'date', 'issue date', 'fecha')
  const issuer = get(firstRow, 'issuer', 'merchant', 'comercio', 'tienda')

  const hasCop = items.some(i => i.totalPrice > 500)
  const currency: Currency = hasCop ? 'COP' : 'USD'

  return { invoiceNumber, date: parseDate(date), issuer, items, currency }
}

export function ImportCsvDialog({ open, onOpenChange, categories, rates }: ImportCsvDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [parsed, setParsed] = useState<ParsedCsv | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showFormat, setShowFormat] = useState(false)
  const [merchant, setMerchant] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [currency, setCurrency] = useState<Currency>('COP')
  const [categoryId, setCategoryId] = useState<string>('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const supportRef = useRef<HTMLInputElement>(null)
  const { getToken } = useAuth()

  const downloadTemplate = useCallback((type: 'products' | 'service') => {
    let csv: string
    if (type === 'products') {
      csv = 'Description,Qty,Unit Price,Total,Category\nLeche deslactosada,2,4500,9000,Lacteos\nPan integral,1,5800,5800,Panaderia\nHuevos 12pk,1,8900,8900,'
    } else {
      csv = 'Proveedor,Concepto,Monto Total,Moneda,Fecha Transaccion\nClaro,Pago de factura,44950,COP,2026/03/30'
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = type === 'products' ? 'plantilla-productos.csv' : 'plantilla-servicio.csv'
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  async function uploadFile(file: File): Promise<string> {
    setUploadProgress(10)
    const formData = new FormData()
    formData.append('file', file)
    const token = await getToken()
    setUploadProgress(30)

    return new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', '/api/files/upload')
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 70) + 30
          setUploadProgress(pct)
        }
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText)
            if (data.url) { setUploadProgress(100); resolve(data.url) }
            else reject(new Error('El servidor no devolvió la URL del archivo'))
          } catch { reject(new Error('Error procesando la respuesta')) }
        } else {
          let errMsg = `Error ${xhr.status}`
          try { const d = JSON.parse(xhr.responseText); errMsg = d.error || errMsg } catch {}
          reject(new Error(errMsg))
        }
      }
      xhr.onerror = () => reject(new Error('Error de conexión'))
      xhr.send(formData)
    })
  }

  const { addInvoice } = useInvoices(rates)
  const expenseCategories = useMemo(() => categories.filter(c => c.type === 'expense'), [categories])

  const total = useMemo(() => {
    if (!parsed) return 0
    return parsed.items.reduce((sum, i) => sum + i.totalPrice, 0)
  }, [parsed])

  function reset() {
    setParsed(null)
    setError(null)
    setShowFormat(false)
    setMerchant('')
    setDate(new Date().toISOString().slice(0, 10))
    setCurrency('COP')
    setCategoryId('')
    setPendingFile(null)
    setUploadProgress(0)
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null)
    setParsed(null)

    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      setError('El archivo debe ser .csv')
      return
    }

    const text = await file.text()
    const result = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
    })

    if (result.errors.length > 0 && result.data.length === 0) {
      setError('No se pudo parsear el CSV')
      return
    }

    const detected = detectCsv(result.data)
    if (!detected) {
      setError('No se detectaron items en el CSV. Formatos soportados: (1) Factura de productos con columnas "Description", "Qty", "Unit Price". (2) Recibo de servicio con columnas "Proveedor", "Monto Total", "Concepto".')
      return
    }

    setParsed(detected)
    if (detected.issuer) setMerchant(detected.issuer)
    if (detected.date) setDate(detected.date)
    setCurrency(detected.currency)

    const defaultCat = expenseCategories.find(c => c.name === 'Supermercado')
    if (defaultCat) setCategoryId(String(defaultCat.id))
  }

  async function handleImport() {
    if (!parsed || !categoryId) return

    const catId = Number(categoryId)

    let attachmentUrl: string | undefined
    if (pendingFile) {
      try {
        attachmentUrl = await uploadFile(pendingFile)
      } catch (e) {
        setUploadProgress(0)
        toast.error(e instanceof Error ? e.message : 'Error al subir el soporte')
        return
      }
    }

    const formData: InvoiceFormData = {
      merchant,
      date,
      currency,
      categoryId: catId,
      items: parsed.items.map(i => ({
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.totalPrice > 0 && i.quantity > 0 ? i.totalPrice / i.quantity : i.unitPrice,
        ...(i.subCategory ? { subCategory: i.subCategory } : {}),
      })),
      attachmentUrl,
    }

    try {
      await addInvoice(formData)
      toast.success(`Factura creada: ${parsed.items.length} items, ${formatMoney(total, currency)}`)
      handleOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al crear la factura')
    }
  }

  const canImport = parsed && merchant && categoryId && total > 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Importar factura desde CSV</DialogTitle>
          <DialogDescription>
            Sube un CSV con los items de tu factura o un recibo de servicio.
          </DialogDescription>
          <button
            type="button"
            onClick={() => setShowFormat(f => !f)}
            className="inline-flex items-center gap-1 text-[11px] text-text-muted hover:text-brand"
          >
            <HelpCircle className="h-3 w-3" /> Ver formatos soportados
          </button>
          {showFormat && (
            <div className="rounded-md border border-border bg-surface-2 px-4 py-3 text-[12px] space-y-3">
              <div>
                <p className="font-medium mb-1">Factura de productos (supermercado, tienda):</p>
                <code className="block text-[11px] bg-surface rounded px-2 py-1 text-text-muted">
                  Description,Qty,Unit Price,Total,Category<br />
                  Leche deslactosada,2,4500,9000,Lacteos<br />
                  Pan integral,1,5800,5800,Panaderia
                </code>
                <button type="button" onClick={() => downloadTemplate('products')} className="text-brand text-[11px] mt-1 hover:underline">
                  Descargar plantilla CSV
                </button>
              </div>
              <div>
                <p className="font-medium mb-1">Recibo de servicio (Claro, EPM, etc.):</p>
                <code className="block text-[11px] bg-surface rounded px-2 py-1 text-text-muted">
                  Proveedor,Concepto,Monto Total,Moneda,Fecha Transaccion<br />
                  Claro,Pago de factura,44950,COP,2026/03/30
                </code>
                <button type="button" onClick={() => downloadTemplate('service')} className="text-brand text-[11px] mt-1 hover:underline">
                  Descargar plantilla CSV
                </button>
              </div>
            </div>
          )}
        </DialogHeader>

        <div className="overflow-y-auto -mx-4 px-4 flex-1 space-y-4">
          {!parsed ? (
            <div
              className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-10 cursor-pointer hover:border-accent/40 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <FileUp className="h-8 w-8 text-text-muted" />
              <p className="text-[13px] text-text-muted">Click para elegir archivo .csv</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFile}
              />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Comercio</Label>
                  <Input value={merchant} onChange={(e) => setMerchant(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Fecha</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Moneda</Label>
                  <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COP">COP — Peso col.</SelectItem>
                      <SelectItem value="USD">USD — Dólar</SelectItem>
                      <SelectItem value="EUR">EUR — Euro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Categoría</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-lg bg-surface-2 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-medium">{parsed.items.length} items detectados</p>
                  {parsed.invoiceNumber && (
                    <p className="text-[12px] text-text-muted">Factura {parsed.invoiceNumber}</p>
                  )}
                </div>
                <p className="font-mono text-[15px] font-semibold">{formatMoney(total, currency)}</p>
              </div>

              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-left text-[12px]">
                  <thead>
                    <tr className="border-b border-border bg-surface-2 text-[10px] uppercase tracking-[0.06em] text-text-faint">
                      <th className="px-3 py-1.5 font-medium">Descripción</th>
                      <th className="w-12 px-2 py-1.5 text-center font-medium">Cant.</th>
                      <th className="w-20 px-2 py-1.5 text-right font-medium">Precio</th>
                      <th className="w-20 px-2 py-1.5 text-right font-medium">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="max-h-[200px] overflow-y-auto">
                    {parsed.items.map((item, i) => (
                      <tr key={i} className="border-b border-border/30">
                        <td className="px-3 py-1 truncate max-w-[200px]">{item.name}</td>
                        <td className="px-2 py-1 text-center font-mono">{item.quantity}</td>
                        <td className="px-2 py-1 text-right font-mono">{formatMoney(item.unitPrice, currency)}</td>
                        <td className="px-2 py-1 text-right font-mono font-medium">{formatMoney(item.totalPrice, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Soporte */}
              <div className="grid gap-1.5">
                <Label className="text-[12px] uppercase tracking-[0.06em] text-text-muted">Soporte (opcional)</Label>
                <input
                  ref={supportRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) setPendingFile(f) }}
                />
                {pendingFile ? (
                  <div className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2">
                    <FileText className="h-4 w-4 shrink-0 text-text-muted" />
                    <span className="flex-1 truncate text-[12px] text-text-muted">{pendingFile.name}</span>
                    <button
                      type="button"
                      onClick={() => { setPendingFile(null); setUploadProgress(0); if (supportRef.current) supportRef.current.value = '' }}
                      className="text-text-muted hover:text-danger-strong"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => supportRef.current?.click()}
                    className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-[12px] text-text-muted transition-colors hover:border-brand/40 hover:bg-brand/5 hover:text-brand"
                  >
                    <Upload className="h-4 w-4" />
                    Subir imagen o PDF
                  </button>
                )}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="h-1.5 w-full rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
                {uploadProgress > 0 && (
                  <p className="text-[11px] text-text-muted">
                    {uploadProgress >= 100 ? 'Procesando…' : `Subiendo… ${uploadProgress}%`}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {error && (
          <p className="text-[13px] text-danger-strong px-4">{error}</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancelar</Button>
          {parsed && (
            <Button onClick={handleImport} disabled={!canImport}>
              Crear factura
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
