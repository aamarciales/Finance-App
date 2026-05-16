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
import type { Category } from '@/types/domain'

interface OcrPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  result: OcrResult
  imageBlob: Blob
  categories: Category[]
  onSave: (data: {
    merchant: string
    date: string
    currency: 'COP' | 'USD' | 'EUR'
    categoryId: number
    items: Array<{ name: string; quantity: number; unitPrice: number; subCategory?: string }>
    file: File
  }) => Promise<void>
}

export function OcrPreviewDialog({ open, onOpenChange, result, imageBlob, categories, onSave }: OcrPreviewDialogProps) {
  const expenseCategories = categories.filter(c => c.type === 'expense')

  const [merchant, setMerchant] = useState(result.merchant)
  const parsedDate = typeof result.date === 'string' ? result.date : format(result.date, 'yyyy-MM-dd')
  const [date, setDate] = useState(parsedDate)
  const [currency, setCurrency] = useState<'COP' | 'USD' | 'EUR'>(result.currency === 'USD' ? 'USD' : result.currency === 'EUR' ? 'EUR' : 'COP')
  const [categoryId, setCategoryId] = useState<string>(String(expenseCategories[0]?.id ?? ''))
  const [items, setItems] = useState<OcrItem[]>(result.items.map(i => ({ ...i })))
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const total = items.reduce((s, i) => s + i.quantity * i.price, 0)

  function updateItem(index: number, field: keyof OcrItem, value: string | number) {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  function removeItem(index: number) {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  function addItem() {
    setItems(prev => [...prev, { description: '', quantity: 1, price: 0 }])
  }

  async function handleSave() {
    setSaving(true)
    try {
      const file = new File([imageBlob], 'receipt.jpg', { type: imageBlob.type || 'image/jpeg' })
      await onSave({
        merchant,
        date,
        currency,
        categoryId: Number(categoryId),
        items: items.map(i => ({
          name: i.description,
          quantity: i.quantity,
          unitPrice: i.price,
          subCategory: i.category,
        })),
        file,
      })
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  const confidenceTone: 'green' | 'gold' | 'danger' = result.confidence > 0.9 ? 'green' : result.confidence > 0.7 ? 'gold' : 'danger'
  const confidenceLabel = result.confidence > 0.9 ? 'Alta confianza' : result.confidence > 0.7 ? 'Revisar datos' : 'Baja confianza'

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
                  <Badge tone={confidenceTone}>{confidenceLabel} ({(result.confidence * 100).toFixed(0)}%)</Badge>
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

                {/* Items table */}
                <div>
                  <Label className="mb-2 block text-[11px] uppercase tracking-[0.06em] text-text-muted">Ítems ({items.length})</Label>
                  <div className="rounded-md border border-border">
                    <table className="w-full text-left text-[13px]">
                      <thead>
                        <tr className="border-b border-border text-[11px] uppercase tracking-[0.06em] text-text-faint">
                          <th className="py-1.5 pl-3 pr-2 font-medium">Descripción</th>
                          <th className="w-24 py-1.5 px-1 font-medium">Subcategoría</th>
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
                                value={item.category ?? ''}
                                onChange={e => updateItem(i, 'category', e.target.value)}
                                className="h-7 text-[13px]"
                                placeholder="—"
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

                {/* Total */}
                <div className="flex items-center justify-between rounded-md bg-surface-2 px-4 py-3">
                  <span className="text-[12px] uppercase tracking-[0.06em] text-text-muted">Total</span>
                  <span className="font-mono text-[15px] font-medium">{formatMoney(total, currency)}</span>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                  <Button onClick={handleSave} disabled={saving || !categoryId || items.length === 0}>
                    {saving ? 'Guardando…' : 'Guardar factura'}
                  </Button>
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
