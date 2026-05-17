import { useEffect, useState, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, X, Upload, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@clerk/clerk-react'
import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/lib/api'
import { cn } from '@/lib/utils'
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
import type { AppSettings, CapitalAccount, Category } from '@/types/domain'
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
  accountId: z.string().nullable().optional(),
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
    categoryId: number
    attachmentUrl?: string
    accountId?: string | null
  }) => Promise<void>
  editInvoice?: EnrichedInvoice
}

export function InvoiceFormDialog({ open, onOpenChange, categories, onSubmit, editInvoice }: InvoiceFormDialogProps) {

  const { getToken } = useAuth()
  const api = useApi()
  const expenseCategories = categories.filter(c => c.type === 'expense')
  const isEditing = !!editInvoice
  const editCategoryId = editInvoice?.transactionCategoryId ?? 1

  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const rows = await api.get<{ key: string; value: unknown }[]>('/settings')
      const map: Record<string, unknown> = {}
      for (const r of rows) map[r.key] = r.value
      return map as Partial<AppSettings>
    },
  })
  const capitalAccounts: CapitalAccount[] = (settingsData?.capitalAccounts as CapitalAccount[] | undefined) ?? []

  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [existingAttachment, setExistingAttachment] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      accountId: null,
    },
  })

  useEffect(() => {
    if (isEditing && editInvoice) {
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
              subCategory: item.subCategory ?? undefined,
            }))
          : [{ name: '', quantity: 1, unitPrice: 0 }],
        accountId: null,
      })
      setExistingAttachment(editInvoice.attachmentUrl ?? null)
      setPendingFile(null)
    } else {
      reset({
        merchant: '',
        branch: '',
        date: new Date().toISOString().slice(0, 10),
        currency: 'COP',
        categoryId: 0,
        items: [{ name: '', quantity: 1, unitPrice: 0 }],
        accountId: null,
      })
      setExistingAttachment(null)
      setPendingFile(null)
    }
  }, [editInvoice, open, reset])

  const items = watch('items')
  const currency = watch('currency')
  const total = items.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0)

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
          const pct = Math.round((e.loaded / e.total) * 70) + 30 // 30-100%
          setUploadProgress(pct)
        }
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText)
            if (data.url) {
              setUploadProgress(100)
              resolve(data.url)
            } else {
              reject(new Error('El servidor no devolvió la URL del archivo'))
            }
          } catch {
            reject(new Error('Error procesando la respuesta del servidor'))
          }
        } else {
          let errMsg = `Error ${xhr.status}`
          try {
            const errData = JSON.parse(xhr.responseText)
            errMsg = errData.error || errMsg
          } catch {}
          reject(new Error(errMsg))
        }
      }
      xhr.onerror = () => reject(new Error('Error de conexión al subir archivo'))
      xhr.send(formData)
    })
  }

  const [submitError, setSubmitError] = useState<string | null>(null)

  async function handleFormSubmit(values: InvoiceFormValues) {
    setSubmitError(null)
    setUploadProgress(0)
    try {
      let attachmentUrl = existingAttachment ?? undefined

      if (pendingFile) {
        try {
          attachmentUrl = await uploadFile(pendingFile)
        } catch (uploadErr) {
          setUploadProgress(0)
          setSubmitError(uploadErr instanceof Error ? uploadErr.message : 'Error subiendo archivo')
          toast.error('Error al subir el archivo. Intenta de nuevo.')
          return
        }
      }

      await onSubmit({
        ...values,
        attachmentUrl,
      })
      reset()
      setPendingFile(null)
      setExistingAttachment(null)
      setUploadProgress(0)
      onOpenChange(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al guardar la factura'
      setSubmitError(msg)
      setUploadProgress(0)
      toast.error(msg)
    }
  }

  const hasFile = !!pendingFile || !!existingAttachment
  const fileName = pendingFile?.name ?? (existingAttachment ? existingAttachment.split('/').pop() : null)
  const isImage = pendingFile?.type.startsWith('image/') ?? (existingAttachment ? /\.(jpg|jpeg|png|webp|heic)$/i.test(existingAttachment) : false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
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

          {capitalAccounts.length > 0 && (
            <div className="grid gap-1.5">
              <Label>Cuenta</Label>
              <Controller
                name="accountId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(v) => field.onChange(v || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Ninguna" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Ninguna</SelectItem>
                      {capitalAccounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name} ({acc.currency})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          <div className="grid grid-cols-[1fr_240px] gap-6">
            {/* Left: items */}
            <div className="grid gap-2">
              <Label className="text-[12px] uppercase tracking-[0.06em] text-text-muted">Ítems</Label>
              {items.map((_, i) => {
                const itemErrs = errors.items?.[i] as Record<string, { message?: string }> | undefined
                return (
                  <div key={i} className="grid gap-1">
                    <div className="grid grid-cols-[1fr_50px_80px_28px] gap-2 items-center">
                      <div>
                        {i === 0 && <span className="text-[11px] text-text-faint">Descripción</span>}
                        <Input {...register(`items.${i}.name`)} placeholder="Ej. Leche" className={cn('text-[13px]', itemErrs?.name && 'border-danger-strong')} />
                      </div>
                      <div>
                        {i === 0 && <span className="text-[11px] text-text-faint">Cant.</span>}
                        <Input type="number" step="any" {...register(`items.${i}.quantity`, { valueAsNumber: true })} className={cn('text-[13px] font-mono', (itemErrs?.quantity) && 'border-danger-strong')} />
                      </div>
                      <div>
                        {i === 0 && <span className="text-[11px] text-text-faint">Precio</span>}
                        <Input type="number" step="any" {...register(`items.${i}.unitPrice`, { valueAsNumber: true })} className={cn('text-[13px] font-mono', (itemErrs?.unitPrice) && 'border-danger-strong')} />
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-7 shrink-0" disabled={items.length <= 1}
                        onClick={() => { const n = [...items]; n.splice(i, 1); reset({ ...watch(), items: n }) }}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {itemErrs && (
                      <p className="text-[11px] text-danger-strong">
                        {[itemErrs.name?.message, itemErrs.quantity?.message, itemErrs.unitPrice?.message].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                )
              })}
              <Button type="button" variant="outline" size="sm" className="w-fit gap-1 text-[12px]"
                onClick={() => { reset({ ...watch(), items: [...items, { name: '', quantity: 1, unitPrice: 0 }] }) }}>
                <Plus className="h-3 w-3" /> Agregar ítem
              </Button>
              {typeof errors.items?.message === 'string' && <p className="text-[12px] text-danger-strong">{errors.items.message}</p>}

              <div className="flex items-center justify-between rounded-md bg-surface-2 px-3 py-2 text-[13px]">
                <span className="text-text-muted">Total</span>
                <span className="font-mono font-medium">{currency} {total.toLocaleString('es-CO', { minimumFractionDigits: currency !== 'COP' ? 2 : 0 })}</span>
              </div>
            </div>

            {/* Right: soporte */}
            <div className="flex flex-col gap-4 self-start sticky top-0">
              <Label className="text-[12px] uppercase tracking-[0.06em] text-text-muted">Soporte</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) setPendingFile(f) }}
              />
              <div className="w-[240px]">
                {hasFile ? (
                  <div className="rounded-lg border border-border overflow-hidden">
                    {isImage ? (
                      <img
                        src={pendingFile ? URL.createObjectURL(pendingFile) : existingAttachment!}
                        alt="Soporte"
                        className="w-full h-[180px] object-cover"
                      />
                    ) : (
                      <div className="flex items-center gap-2 p-3 h-[180px]">
                        <FileText className="h-8 w-8 text-text-muted" />
                        <span className="flex-1 truncate text-[12px] text-text-muted">{fileName}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between px-3 py-1.5 bg-surface-2">
                      <span className="truncate text-[11px] text-text-muted max-w-[140px]">{fileName}</span>
                      <button type="button"
                        onClick={() => { setPendingFile(null); setExistingAttachment(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                        className="text-[11px] text-danger-strong hover:underline">
                        Eliminar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border w-full h-[180px] text-[13px] text-text-muted transition-colors hover:border-brand/40 hover:bg-brand/5 hover:text-brand"
                  >
                    <Upload className="h-5 w-5" />
                    Subir imagen o PDF
                  </button>
                )}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="mt-2 h-1.5 w-full rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
                {uploadProgress > 0 && (
                  <p className="mt-1 text-[11px] text-text-muted text-center">
                    {uploadProgress >= 100 ? 'Procesando…' : `Subiendo… ${uploadProgress}%`}
                  </p>
                )}
              </div>
            </div>
          </div>

          {Object.keys(errors).length > 0 && (
            <div className="rounded-md bg-red-50 px-3 py-2">
              <p className="text-[12px] font-medium text-danger-strong mb-1">Corrige estos errores:</p>
              <ul className="text-[11px] text-danger-strong list-disc pl-4 space-y-0.5">
                {errors.merchant && <li>Comercio: {errors.merchant.message}</li>}
                {errors.date && <li>Fecha: {errors.date.message}</li>}
                {errors.currency && <li>Moneda: {errors.currency.message}</li>}
                {errors.categoryId && <li>Categoría: {errors.categoryId.message}</li>}
                {Array.isArray(errors.items) && errors.items.map((itemErr, i) =>
                  itemErr ? <li key={i}>Ítem {i + 1}: {[itemErr.name?.message, itemErr.quantity?.message, itemErr.unitPrice?.message].filter(Boolean).join(', ')}</li> : null
                )}
                {typeof errors.items?.message === 'string' && <li>{errors.items.message}</li>}
              </ul>
            </div>
          )}
          {submitError && (
            <p className="text-[12px] text-danger-strong rounded-md bg-red-50 px-3 py-2">
              {submitError}
            </p>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando…' : 'Guardar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
