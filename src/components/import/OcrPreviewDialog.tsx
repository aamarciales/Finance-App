import { useState } from 'react'
import { format } from 'date-fns'
import { Plus, X, ZoomIn } from 'lucide-react'
import {
  Dialog,
  DialogContent,
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
import { Badge } from '@/components/common/Badge'
import { Lightbox } from '@/components/common/Lightbox'
import { CURRENCIES } from '@/lib/validators'
import { formatMoney } from '@/lib/format'
import type { OcrResult, OcrItem } from '@/lib/ocr'
import type { Category, CapitalAccount } from '@/types/domain'

export interface OcrInvoiceData {
  merchant: string
  date: string
  currency: 'COP' | 'USD' | 'EUR'
  categoryId: number
  items: Array<{ name: string; quantity: number; unitPrice: number }>
  subtotal?: number
  discount?: number
  total: number
  attachmentUrl?: string
  accountId?: string | null
}

export interface OcrTransactionData {
  concept: string
  date: string
  amount: number
  currency: 'COP' | 'USD' | 'EUR'
  categoryId: number
  attachments?: string[]
  accountId?: string | null
}

interface OcrPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  result: OcrResult
  imageBlob: Blob
  categories: Category[]
  capitalAccounts?: CapitalAccount[]
  onSaveInvoice?: (data: OcrInvoiceData) => Promise<void>
  onSaveTransaction?: (data: OcrTransactionData) => Promise<void>
}

export function OcrPreviewDialog({ open, onOpenChange, result, imageBlob, categories, capitalAccounts = [], onSaveInvoice, onSaveTransaction }: OcrPreviewDialogProps) {
  const expenseCategories = categories.filter(c => c.type === 'expense')

  const [merchant, setMerchant] = useState(result.merchant)
  const parsedDate = typeof result.date === 'string' ? result.date : format(result.date, 'yyyy-MM-dd')
  const [date, setDate] = useState(parsedDate)
  const [currency, setCurrency] = useState<'COP' | 'USD' | 'EUR'>(result.currency === 'USD' ? 'USD' : result.currency === 'EUR' ? 'EUR' : 'COP')
  const [categoryId, setCategoryId] = useState<string>(String(expenseCategories[0]?.id ?? ''))
  const [accountId, setAccountId] = useState<string | null>(null)
  const [items, setItems] = useState<OcrItem[]>(result.items.map(i => {
    // If OCR returned lineTotal, derive unit price from it
    if (i.lineTotal && i.quantity > 0) {
      return { ...i, price: Math.round(i.lineTotal / i.quantity) }
    }
    return { ...i }
  }))
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const itemsTotal = items.reduce((s, i) => s + i.quantity * i.price, 0)
  const discount = result.discount ?? 0
  const total = Math.max(0, itemsTotal - discount)
  const realConfidence = result.realConfidence ?? 'low'

  function updateItem(index: number, field: keyof OcrItem, value: string | number) {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  function removeItem(index: number) {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  function addItem() {
    setItems(prev => [...prev, { description: '', quantity: 1, price: 0 }])
  }

  async function handleSaveInvoice() {
    if (!onSaveInvoice) return
    setSaving(true)
    try {
      await onSaveInvoice({
        merchant,
        date,
        currency,
        categoryId: Number(categoryId),
        items: items.map(i => ({
          name: i.description,
          quantity: i.quantity,
          unitPrice: i.price,
        })),
        subtotal: itemsTotal,
        discount: discount || undefined,
        total,
        attachmentUrl: result.imageUrl,
        accountId,
      })
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveTransaction() {
    if (!onSaveTransaction) return
    setSaving(true)
    try {
      await onSaveTransaction({
        concept: merchant,
        date,
        amount: total,
        currency,
        categoryId: Number(categoryId),
        attachments: result.imageUrl ? [result.imageUrl] : undefined,
        accountId,
      })
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  const confidenceBadge: { tone: 'green' | 'gold' | 'danger'; label: string } =
    realConfidence === 'high'
      ? { tone: 'green', label: 'Validado' }
      : realConfidence === 'medium'
        ? { tone: 'gold', label: 'Revisar montos' }
        : { tone: 'danger', label: 'Revisión obligatoria' }

  const imageUrl = URL.createObjectURL(imageBlob)

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl p-0 overflow-hidden" showCloseButton={false}>
          <div className="max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 z-10 border-b border-border bg-surface px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="font-serif text-xl">Resultado OCR</h2>
                  <Badge tone={confidenceBadge.tone}>{confidenceBadge.label}</Badge>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-[240px_1fr]">
              {/* Image */}
              <div>
                <Label className="mb-2 block text-[11px] uppercase tracking-[0.06em] text-text-muted">Imagen</Label>
                <button
                  type="button"
                  onClick={() => setLightboxSrc(imageUrl)}
                  className="group relative block overflow-hidden rounded-md border border-border"
                >
                  <img src={imageUrl} alt="Receipt" className="w-full object-contain" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                    <ZoomIn className="h-6 w-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </button>
              </div>

              {/* Form */}
              <div className="space-y-4">
                <div className="grid grid-cols-[1fr_120px_100px] gap-3">
                  <div className="grid gap-1.5">
                    <Label>Comercio</Label>
                    <Input value={merchant} onChange={e => setMerchant(e.target.value)} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Fecha</Label>
                    <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Moneda</Label>
                    <Select value={currency} onValueChange={v => setCurrency(v as 'COP' | 'USD' | 'EUR')}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label>Categoría</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {capitalAccounts.length > 0 && (
                  <div className="grid gap-1.5">
                    <Label>Cuenta</Label>
                    <Select
                      value={accountId ?? '__none__'}
                      onValueChange={v => setAccountId(v === '__none__' ? null : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Ninguna" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Ninguna</SelectItem>
                        {capitalAccounts.map(acc => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.name} ({acc.currency})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Validation warning */}
                {realConfidence === 'low' && result.validation && (
                  <div className="rounded-md border border-danger-strong/30 bg-danger-strong/5 px-4 py-3 text-[13px] text-danger-strong">
                    <p className="font-medium">El total calculado ({formatMoney(result.validation.computedSubtotal, currency)}) no coincide con el total del recibo ({formatMoney(result.total, currency)}). Diferencia: {formatMoney(result.validation.subtotalDelta, currency)}. Revisa los items antes de guardar.</p>
                  </div>
                )}

                {/* Items table */}
                <div>
                  <Label className="mb-2 block text-[11px] uppercase tracking-[0.06em] text-text-muted">Ítems ({items.length})</Label>
                  <div className="rounded-md border border-border">
                    <table className="w-full text-left text-[13px]">
                      <thead>
                        <tr className="border-b border-border text-[11px] uppercase tracking-[0.06em] text-text-faint">
                          <th className="py-1.5 pl-3 pr-2 font-medium">Descripción</th>
                          <th className="w-16 py-1.5 px-1 text-center font-medium">Cant.</th>
                          <th className="w-24 py-1.5 px-1 text-right font-medium">Precio</th>
                          <th className="w-24 py-1.5 px-1 text-right font-medium">Subtotal</th>
                          <th className="w-8 py-1.5 pr-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, i) => (
                          <tr key={i} className="border-b border-border/30">
                            <td className="py-1 pl-3 pr-2">
                              <Input
                                value={item.description}
                                onChange={e => updateItem(i, 'description', e.target.value)}
                                className="h-7 text-[13px]"
                              />
                            </td>
                            <td className="py-1 px-1">
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={e => updateItem(i, 'quantity', Number(e.target.value) || 1)}
                                className="h-7 text-[13px] font-mono text-center"
                              />
                            </td>
                            <td className="py-1 px-1">
                              <Input
                                type="number"
                                step="any"
                                value={item.price}
                                onChange={e => updateItem(i, 'price', Number(e.target.value) || 0)}
                                className="h-7 text-[13px] font-mono text-right"
                              />
                            </td>
                            <td className="py-1 px-1 text-right font-mono text-[13px]">
                              {formatMoney(item.quantity * item.price, currency)}
                            </td>
                            <td className="py-1 pr-2">
                              <button
                                type="button"
                                onClick={() => removeItem(i)}
                                className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-surface-2"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <button
                      type="button"
                      onClick={addItem}
                      className="flex w-full items-center justify-center gap-1 py-1.5 text-[12px] text-text-muted hover:text-text"
                    >
                      <Plus className="h-3 w-3" /> Agregar ítem
                    </button>
                  </div>
                </div>

                {/* Totals */}
                <div className="rounded-md bg-surface-2 px-4 py-3 space-y-1.5">
                  {discount > 0 && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] uppercase tracking-[0.06em] text-text-muted">Subtotal</span>
                        <span className="font-mono text-[13px]">{formatMoney(itemsTotal, currency)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] uppercase tracking-[0.06em] text-text-muted">Descuento</span>
                        <span className="font-mono text-[13px] text-brand">−{formatMoney(discount, currency)}</span>
                      </div>
                    </>
                  )}
                  <div className={discount > 0 ? 'flex items-center justify-between pt-1 border-t border-border/50' : 'flex items-center justify-between'}>
                    <span className="text-[12px] uppercase tracking-[0.06em] text-text-muted">Total</span>
                    <span className="font-mono text-[15px] font-medium">{formatMoney(total, currency)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                  {onSaveTransaction && (
                    <Button
                      variant="outline"
                      onClick={handleSaveTransaction}
                      disabled={saving || !categoryId}
                    >
                      {saving ? 'Guardando…' : 'Guardar como transacción'}
                    </Button>
                  )}
                  {onSaveInvoice && (
                    <Button
                      onClick={handleSaveInvoice}
                      disabled={saving || !categoryId || items.length === 0}
                    >
                      {saving ? 'Guardando…' : 'Guardar como factura'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </>
  )
}
