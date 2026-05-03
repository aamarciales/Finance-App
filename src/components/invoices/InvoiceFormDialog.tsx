import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, X, Upload } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { CURRENCIES } from '@/lib/validators'
import type { Category } from '@/types/domain'
import type { EnrichedInvoice } from '@/hooks/useInvoices'

const itemSchema = z.object({
  name: z.string().min(1, 'Nombre obligatorio'),
  quantity: z.number({ message: 'Cantidad obligatoria' }).positive(),
  unitPrice: z.number({ message: 'Precio obligatorio' }).positive(),
  subCategory: z.string().optional(),
})

const invoiceSchema = z.object({
  merchant: z.string().min(1, 'Comercio obligatorio'),
  branch: z.string().optional(),
  date: z.string().min(1),
  currency: z.enum(CURRENCIES),
  categoryId: z.number().positive(),
  items: z.array(itemSchema).min(1, 'Agrega al menos un ítem'),
})

type InvoiceFormValues = z.infer<typeof invoiceSchema>

interface InvoiceFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
  onSubmit: (data: {
    merchant: string
    branch?: string
    date: string
    currency: 'COP' | 'USD' | 'EUR'
    items: Array<{ name: string; quantity: number; unitPrice: number; subCategory?: string }>
    file?: File
    removeAttachment?: boolean
    categoryId: number
  }) => Promise<void>
  editInvoice?: EnrichedInvoice
}

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function InvoiceFormDialog({ open, onOpenChange, categories, onSubmit, editInvoice }: InvoiceFormDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [removeAttachment, setRemoveAttachment] = useState(false)

  const expenseCategories = categories.filter(c => c.type === 'expense')
  const isEditing = !!editInvoice

  const editCategoryId = editInvoice?.transactionCategoryId ?? 1

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      merchant: '',
      branch: '',
      date: new Date().toISOString().slice(0, 10),
      currency: 'COP',
      categoryId: 0,
      items: [{ name: '', quantity: 1, unitPrice: 0 }],
    },
  })

  useEffect(() => {
    if (editInvoice) {
      reset({
        merchant: editInvoice.merchant,
        branch: editInvoice.branch ?? '',
        date: editInvoice.date,
        currency: editInvoice.currency,
        categoryId: editCategoryId,
        items: editInvoice.items.length > 0
          ? editInvoice.items.map(item => ({
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice ?? (item.totalPrice / Math.max(item.quantity, 1)),
              subCategory: item.subCategory,
            }))
          : [{ name: '', quantity: 1, unitPrice: 0 }],
      })
      // Show existing attachment preview
      if (editInvoice.attachment?.blob) {
        setFilePreview(URL.createObjectURL(editInvoice.attachment.blob))
      } else {
        setFilePreview(null)
      }
      setFile(null)
      setRemoveAttachment(false)
    } else {
      reset({
        merchant: '',
        branch: '',
        date: new Date().toISOString().slice(0, 10),
        currency: 'COP',
        categoryId: 0,
        items: [{ name: '', quantity: 1, unitPrice: 0 }],
      })
      setFile(null)
      setFilePreview(null)
      setRemoveAttachment(false)
    }
  }, [editInvoice, open, reset])

  const items = watch('items')
  const currency = watch('currency')

  const total = items.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!ACCEPTED_TYPES.includes(f.type)) return
    if (f.size > MAX_FILE_SIZE) return
    setFile(f)
    setRemoveAttachment(false)
    if (filePreview && isEditing) URL.revokeObjectURL(filePreview)
    const url = URL.createObjectURL(f)
    setFilePreview(url)
  }

  function clearFile() {
    if (filePreview) URL.revokeObjectURL(filePreview)
    setFile(null)
    setFilePreview(null)
    if (isEditing && editInvoice?.attachment) {
      setRemoveAttachment(true)
    }
  }

  async function handleFormSubmit(values: InvoiceFormValues) {
    await onSubmit({
      ...values,
      file: file ?? undefined,
      removeAttachment: removeAttachment || undefined,
    })
    reset()
    clearFile()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            {isEditing ? 'Editar factura' : 'Nueva factura'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="grid gap-4 py-2">
          <div className="grid grid-cols-[1fr_120px] gap-3">
            <div className="grid gap-1.5">
              <Label>Comercio</Label>
              <Input {...register('merchant')} placeholder="Ej. Éxito" />
              {errors.merchant && <p className="text-[12px] text-danger-strong">{errors.merchant.message}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label>Fecha</Label>
              <Input type="date" {...register('date')} />
            </div>
          </div>

          <div className="grid grid-cols-[1fr_120px] gap-3">
            <div className="grid gap-1.5">
              <Label>Sucursal</Label>
              <Input {...register('branch')} placeholder="Ej. Chapinero" />
            </div>
            <div className="grid gap-1.5">
              <Label>Moneda</Label>
              <Controller name="currency" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Categoría</Label>
            <Controller name="categoryId" control={control} render={({ field }) => (
              <Select value={field.value ? String(field.value) : ''} onValueChange={(v) => field.onChange(Number(v))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                <SelectContent>
                  {expenseCategories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )} />
            {errors.categoryId && <p className="text-[12px] text-danger-strong">{errors.categoryId.message}</p>}
          </div>

          {/* Items */}
          <div className="grid gap-2">
            <Label className="text-[12px] uppercase tracking-[0.06em] text-text-muted">Ítems</Label>
            {items.map((_, i) => (
              <div key={i} className="grid grid-cols-[1fr_50px_80px_28px] gap-2 items-end">
                <div>
                  {i === 0 && <span className="text-[11px] text-text-faint">Descripción</span>}
                  <Input
                    {...register(`items.${i}.name`)}
                    placeholder="Ej. Leche deslactosada"
                    className="text-[13px]"
                  />
                </div>
                <div>
                  {i === 0 && <span className="text-[11px] text-text-faint">Cant.</span>}
                  <Input
                    type="number"
                    step="any"
                    {...register(`items.${i}.quantity`, { valueAsNumber: true })}
                    className="text-[13px] font-mono"
                  />
                </div>
                <div>
                  {i === 0 && <span className="text-[11px] text-text-faint">Precio</span>}
                  <Input
                    type="number"
                    step="any"
                    {...register(`items.${i}.unitPrice`, { valueAsNumber: true })}
                    className="text-[13px] font-mono"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-7 shrink-0"
                  disabled={items.length <= 1}
                  onClick={() => {
                    const newItems = [...items]
                    newItems.splice(i, 1)
                    reset({ ...watch(), items: newItems })
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit gap-1 text-[12px]"
              onClick={() => {
                reset({ ...watch(), items: [...items, { name: '', quantity: 1, unitPrice: 0 }] })
              }}
            >
              <Plus className="h-3 w-3" /> Agregar ítem
            </Button>
            {errors.items && <p className="text-[12px] text-danger-strong">{errors.items.message}</p>}
          </div>

          {/* Total */}
          <div className="flex items-center justify-between rounded-md bg-surface-2 px-3 py-2 text-[13px]">
            <span className="text-text-muted">Total</span>
            <span className="font-mono font-medium">{currency} {total.toLocaleString('es-CO', { minimumFractionDigits: currency !== 'COP' ? 2 : 0 })}</span>
          </div>

          {/* File upload / existing image */}
          <div className="grid gap-1.5">
            <Label>Imagen del ticket</Label>
            {filePreview ? (
              <div className="relative">
                <img src={filePreview} alt="Preview" className="h-32 rounded-md border border-border object-cover" />
                <div className="absolute right-1 top-1 flex gap-1">
                  <label className="cursor-pointer rounded-md bg-surface/80 p-1 hover:bg-surface">
                    <Upload className="h-3.5 w-3.5" />
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
                  </label>
                  <button
                    type="button"
                    onClick={clearFile}
                    className="rounded-md bg-surface/80 p-1 hover:bg-surface"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <label className="flex h-24 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border text-[12px] text-text-muted transition-colors hover:border-brand hover:text-brand">
                <Upload className="h-4 w-4" />
                Adjuntar imagen
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
              </label>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando…' : 'Guardar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
