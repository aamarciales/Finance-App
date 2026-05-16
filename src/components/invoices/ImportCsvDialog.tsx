import { useRef, useState, useMemo } from 'react'
import { FileUp } from 'lucide-react'
import { toast } from 'sonner'
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
  const hasDescription = headers.some(h => h.includes('description') || h.includes('descripcion') || h.includes('producto'))
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
  const [merchant, setMerchant] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [currency, setCurrency] = useState<Currency>('COP')
  const [categoryId, setCategoryId] = useState<string>('')

  const { addInvoice } = useInvoices(rates)
  const expenseCategories = useMemo(() => categories.filter(c => c.type === 'expense'), [categories])

  const total = useMemo(() => {
    if (!parsed) return 0
    return parsed.items.reduce((sum, i) => sum + i.totalPrice, 0)
  }, [parsed])

  function reset() {
    setParsed(null)
    setError(null)
    setMerchant('')
    setDate(new Date().toISOString().slice(0, 10))
    setCurrency('COP')
    setCategoryId('')
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
      setError('No se detectaron items en el CSV. Asegúrate de tener columnas como "Description", "Qty", "Unit Price" o equivalentes.')
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
            Sube un CSV con los items de tu factura.
          </DialogDescription>
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
