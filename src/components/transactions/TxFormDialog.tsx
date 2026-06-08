import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format, parseISO } from 'date-fns'
import { displayLocale } from '../../lib/locale'
import { useAuth } from '@clerk/clerk-react'
import {
  CalendarIcon,
  Link2,
  Upload,
  X,
  FileText,
  Plus,
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  txFormSchema,
  type TxFormValues,
  VISIBLE_TYPES,
  VISIBLE_TYPE_LABELS,
  CURRENCIES,
} from '@/lib/validators'
import type { Category, Debt, Transaction, AppSettings, CapitalAccount, TitheExemption } from '@/types/domain'
import { TITHE_EXEMPTION_AUTO, TITHE_EXEMPTION_OPTIONS } from '@/lib/tithe-exemption'
import { displayTransactionConcept } from '@/lib/category-display'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'


const MAX_FILES = 5
const MAX_FILE_SIZE = 10 * 1024 * 1024
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'application/pdf']

interface PendingFile {
  file: File
  preview?: string
}

interface TxFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
  onSubmit: (values: TxFormValues) => Promise<void>
  editTx?: Transaction
  prefillTx?: Transaction
  rates: { trm: number; eurToUsd: number }
}

function toVisibleType(txType: Transaction['type']): 'expense' | 'income' {
  return txType === 'income' ? 'income' : 'expense'
}

function buildDefaults(editTx: Transaction | undefined, rates: { trm: number }, prefillTx?: Transaction): TxFormValues {
  const source = editTx ?? prefillTx
  if (source) {
    const safeCurrency = (CURRENCIES as readonly string[]).includes(source.currency)
      ? (source.currency as TxFormValues['currency'])
      : 'COP'
    const safeTrm = rates.trm > 0 ? rates.trm : (source.trm || 4200)
    return {
      type: toVisibleType(source.type),
      date: prefillTx ? new Date().toISOString().slice(0, 10) : source.date,
      concept: displayTransactionConcept(source.concept),
      categoryId: source.categoryId,
      amount: source.amount,
      currency: safeCurrency,
      trm: safeTrm,
      notes: source.notes ?? '',
      isRecurring: source.isRecurring ?? false,
      debtId: source.debtId,
      capitalAmount: source.capitalAmount ?? source.amount,
      interestAmount: source.interestAmount ?? 0,
      attachments: editTx?.attachments ?? undefined,
      accountId: source.accountId ?? null,
      titheExemption: source.titheExemption ?? null,
      actualAmount: (() => {
        // Heuristic: if stored trm differs from official by >0.5%, treat as user-entered
        if (!rates.trm || !source.amountInSecondary) return null
        const storedTrm = source.trm ?? rates.trm
        const diff = Math.abs(storedTrm - rates.trm) / rates.trm
        return diff > 0.005 ? source.amountInSecondary : null
      })(),
    }
  }
  return {
    type: 'expense',
    date: new Date().toISOString().slice(0, 10),
    concept: '',
    categoryId: 0,
    amount: 0,
    currency: 'COP',
    trm: rates.trm,
    notes: '',
    isRecurring: false,
    accountId: null,
    titheExemption: null,
    actualAmount: null,
  }
}

export function TxFormDialog({
  open,
  onOpenChange,
  categories,
  onSubmit,
  editTx,
  prefillTx,
  rates,
}: TxFormDialogProps) {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { getToken } = useAuth()

  const api = useApi()
  const queryClient = useQueryClient()
  const [newCatName, setNewCatName] = useState<string | undefined>(undefined)

  const { data: debtsData } = useQuery({
    queryKey: ['debts'],
    queryFn: () => api.get<Debt[]>('/debts'),
  })
  const activeDebts = debtsData?.filter(d => d.currentBalance > 0) ?? []

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

  const defaults = useMemo(() => buildDefaults(editTx, rates, prefillTx), [editTx, rates, prefillTx])

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TxFormValues>({
    resolver: zodResolver(txFormSchema),
    defaultValues: defaults,
  })

  // Fix: react-hook-form ignores defaultValues changes after mount.
  // Force reset when dialog opens or editTx changes.
  useEffect(() => {
    if (open) {
      reset(buildDefaults(editTx, rates, prefillTx))
    }
  }, [editTx, prefillTx, open, reset, rates])

  // Debug: log form validation errors
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.log('[TxForm] Validation errors:', Object.fromEntries(
        Object.entries(errors).map(([k, v]) => [k, v.message])
      ))
    }
  }, [errors])

  const selectedType = watch('type')
  const selectedCategoryId = watch('categoryId')
  const existingAttachments = watch('attachments') ?? []
  const selectedAccountId = watch('accountId')
  const selectedCurrency = watch('currency')

  const handleCreateCategory = useCallback(async () => {
    if (!newCatName?.trim()) return
    const isIncome = selectedType === 'income'
    const colors = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#84CC16']
    const color = colors[Math.floor(Math.random() * colors.length)]
    const result = await api.post<{ id: number }>('/categories', {
      name: newCatName.trim(),
      color,
      icon: 'more-horizontal',
      type: isIncome ? 'income' : 'expense',
      isSystem: false,
    })
    await queryClient.invalidateQueries({ queryKey: ['categories'] })
    setValue('categoryId', result.id)
    setNewCatName(undefined)
  }, [api, newCatName, queryClient, setValue, selectedType])

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId),
    [categories, selectedCategoryId],
  )

  const showDebtFields = (selectedCategory?.name === 'Deuda' || selectedCategory?.name === 'Debt') && selectedType === 'expense'
  const isTransfer = selectedCategory?.name === 'Transferencias' && selectedType === 'expense'

  const filteredCategories = useMemo(() => {
    const isIncome = selectedType === 'income'
    return categories.filter((c) =>
      isIncome ? c.type === 'income' : c.type === 'expense',
    )
  }, [categories, selectedType])

  const handleFormSubmit = useCallback(
    async (values: TxFormValues) => {
      // Upload pending files first
      const token = await getToken()
      const uploadedUrls: string[] = []
      for (const pf of pendingFiles) {
        const fd = new FormData()
        fd.append('file', pf.file)
        try {
          const res = await fetch('/api/files/upload', {
            method: 'POST',
            body: fd,
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          })
          if (res.ok) {
            const data = await res.json()
            if (data.url) uploadedUrls.push(data.url)
          }
        } catch {
          // Skip failed uploads
        }
      }
      // Merge existing + new attachments
      const existing = values.attachments ?? []
      const allAttachments = [...existing, ...uploadedUrls]
      await onSubmit({ ...values, attachments: allAttachments.length > 0 ? allAttachments : undefined })
      setPendingFiles([])
      onOpenChange(false)
    },
    [onSubmit, onOpenChange, pendingFiles],
  )

  function addFiles(fileList: FileList) {
    const newFiles: PendingFile[] = []
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]
      if (pendingFiles.length + newFiles.length >= MAX_FILES) break
      if (!ACCEPTED_TYPES.includes(file.type)) continue
      if (file.size > MAX_FILE_SIZE) continue
      const pf: PendingFile = { file }
      if (file.type.startsWith('image/')) {
        pf.preview = URL.createObjectURL(file)
      }
      newFiles.push(pf)
    }
    setPendingFiles((prev) => [...prev, ...newFiles])
  }

  function removeFile(index: number) {
    setPendingFiles((prev) => {
      const copy = [...prev]
      if (copy[index].preview) URL.revokeObjectURL(copy[index].preview!)
      copy.splice(index, 1)
      return copy
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-[-0.02em]">
            {editTx ? 'Edit transaction' : 'New transaction'}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="grid gap-4 py-2"
        >
          {/* Tipo — solo Gasto / Ingreso */}
          <div className="grid gap-1.5">
            <Label>Type</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v)
                    setValue('categoryId', 0)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VISIBLE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {VISIBLE_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.type && (
              <p className="text-[12px] text-danger-strong">{errors.type.message}</p>
            )}
          </div>

          {/* Fecha */}
          <div className="grid gap-1.5">
            <Label>Date</Label>
            <Controller
              name="date"
              control={control}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'justify-start text-left font-normal',
                        !field.value && 'text-text-muted',
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value
                        ? format(parseISO(field.value), 'dd MMM yyyy', { locale: displayLocale })
                        : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ? parseISO(field.value) : undefined}
                      onSelect={(d) => d && field.onChange(format(d, 'yyyy-MM-dd'))}
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
          </div>

          {/* Concepto */}
          <div className="grid gap-1.5">
            <Label>Description</Label>
            <Input
              {...register('concept')}
              placeholder="E.g. Lunch at La Puerta Falsa"
            />
            {errors.concept && (
              <p className="text-[12px] text-danger-strong">{errors.concept.message}</p>
            )}
          </div>

          {/* Monto + Moneda */}
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div className="grid gap-1.5">
              <Label>Amount</Label>
              <Input
                type="number"
                step="any"
                {...register('amount', { valueAsNumber: true })}
                className="font-mono"
              />
              {errors.amount && (
                <p className="text-[12px] text-danger-strong">{errors.amount.message}</p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label>Currency</Label>
              <Controller
                name="currency"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-[90px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.currency && (
                <p className="text-[12px] text-danger-strong">{errors.currency.message}</p>
              )}
            </div>
          </div>

          {/* Categoría */}
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label>Category</Label>
              <button
                type="button"
                onClick={() => setNewCatName('')}
                className="inline-flex items-center gap-1 text-[11px] text-text-muted hover:text-brand"
              >
                <Plus className="h-3 w-3" /> New
              </button>
            </div>
            <Controller
              name="categoryId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : ''}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ backgroundColor: c.color }}
                          />
                          {c.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {newCatName !== undefined && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Category name"
                  className="flex-1 rounded-md border border-border px-2 py-1 text-[13px]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleCreateCategory()
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  disabled={!newCatName.trim()}
                  className="rounded-md bg-brand px-3 py-1 text-[12px] font-medium text-white disabled:opacity-50"
                >
                  Crear
                </button>
                <button
                  type="button"
                  onClick={() => setNewCatName(undefined)}
                  className="rounded-md border border-border px-2 py-1 text-[12px] text-text-muted"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            {errors.categoryId && (
              <p className="text-[12px] text-danger-strong">{errors.categoryId.message}</p>
            )}
          </div>

          {selectedType === 'income' && (
            <div className="grid gap-1.5">
              <Label>Tithe</Label>
              <Controller
                name="titheExemption"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? TITHE_EXEMPTION_AUTO}
                    onValueChange={(v) =>
                      field.onChange(v === TITHE_EXEMPTION_AUTO ? null : (v as TitheExemption))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TITHE_EXEMPTION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-[11px] text-text-muted">
                Use "Already tithed" for third-party gifts or "Loan" for non-tithable income.
              </p>
            </div>
          )}

          {/* Account */}
          {capitalAccounts.length > 0 && (
            <div className="grid gap-1.5">
              <Label>Account</Label>
              <Controller
                name="accountId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? '__none__'}
                    onValueChange={(v) => field.onChange(v === '__none__' ? null : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
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

          {(() => {
            const selAcc = capitalAccounts.find(a => a.id === selectedAccountId)
            return selAcc && selectedCurrency !== selAcc.currency
          })() && (
            <div className="grid gap-1.5">
              <Label>Actual amount debited in {capitalAccounts.find(a => a.id === selectedAccountId)!.currency}</Label>
              <Controller
                name="actualAmount"
                control={control}
                render={({ field }) => (
                  <Input
                    type="number"
                    step="0.01"
                    placeholder={`Optional · official FX rate: ${rates.trm.toLocaleString('en-US')}`}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                  />
                )}
              />
              <p className="text-[11px] text-text-muted">
                If left empty, the official FX rate is used. Fill this in if the bank charged a different amount due to spread or fees.
              </p>
            </div>
          )}

          {/* Debt fields — only when category = "Deuda" */}
          {showDebtFields && (
            <>
              <div className="grid gap-1.5">
                <Label>Linked debt</Label>
                {activeDebts.length > 0 ? (
                  <Controller
                    name="debtId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value ? String(field.value) : ''}
                        onValueChange={(v) => field.onChange(Number(v))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select debt…" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeDebts.map((d) => (
                            <SelectItem key={d.id} value={String(d.id)}>
                              <span className="flex items-center gap-2">
                                <Link2 className="h-3.5 w-3.5" />
                                {d.name} — {d.creditor}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                ) : (
                  <p className="text-[12px] text-text-muted">
                    No active debts.{' '}
                    <a href="/debts" className="text-brand underline">
                      Record debt
                    </a>
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1.5">
                  <Label>Principal paid</Label>
                  <Input
                    type="number"
                    step="any"
                    {...register('capitalAmount', { valueAsNumber: true })}
                    className="font-mono"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Interest included</Label>
                  <Input
                    type="number"
                    step="any"
                    {...register('interestAmount', { valueAsNumber: true })}
                    className="font-mono"
                  />
                  <p className="text-[10px] text-text-faint">
                    Si es 0, todo el monto es capital.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Transfer info */}
          {isTransfer && (
            <p className="text-[12px] text-text-muted rounded-md bg-surface-2 px-3 py-2">
              Transfers do not count as expense or income in your metrics.
            </p>
          )}

          {/* TRM */}
          <div className="grid gap-1.5">
            <Label>FX rate for the day</Label>
            <Input
              type="number"
              step="0.01"
              {...register('trm', { valueAsNumber: true })}
              className="font-mono"
            />
            <p className="text-[11px] text-text-faint">
              Pre-filled with the official FX rate. Edit if needed.
            </p>
          </div>

          {/* Recurring */}
          <Controller
            name="isRecurring"
            control={control}
            render={({ field }) => (
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                />
                <span className="text-[13px]">Recurring transaction</span>
              </label>
            )}
          />

          {/* Notas */}
          <div className="grid gap-1.5">
            <Label>Notes (optional)</Label>
            <Textarea {...register('notes')} rows={2} />
          </div>

          {/* Adjuntos */}
          <div className="grid gap-1.5">
            <Label>Attachments</Label>
            <div
              className="flex min-h-[72px] cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border p-3 text-text-faint transition-colors hover:border-text-muted hover:text-text-muted"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
              onDrop={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files)
              }}
            >
              <Upload className="h-5 w-5" />
              <span className="text-[11px]">
                Drag files here or click to select
              </span>
              <span className="text-[10px]">
                JPG, PNG, HEIC, PDF · max {MAX_FILES} files · 10 MB each
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.heic,.pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) addFiles(e.target.files)
                e.target.value = ''
              }}
            />
            {existingAttachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {existingAttachments.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2 py-1 text-[11px] text-text-muted hover:text-brand"
                  >
                    <FileText className="h-3 w-3" />
                    Archivo {i + 1}
                  </a>
                ))}
              </div>
            )}
            {pendingFiles.length > 0 && (
              <div className="grid grid-cols-5 gap-2">
                {pendingFiles.map((pf, i) => (
                  <div
                    key={i}
                    className="group relative flex h-14 items-center justify-center rounded-md border border-border bg-surface-2"
                  >
                    {pf.preview ? (
                      <img
                        src={pf.preview}
                        alt=""
                        className="h-full w-full rounded-md object-cover"
                      />
                    ) : (
                      <FileText className="h-5 w-5 text-text-faint" />
                    )}
                    <button
                      type="button"
                      className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger-strong text-white opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => removeFile(i)}
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                    <span className="absolute bottom-0 left-0 right-0 truncate rounded-b-md bg-black/50 px-1 text-[8px] text-white">
                      {pf.file.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {Object.keys(errors).length > 0 && (
            <div className="text-[12px] text-danger-strong">
              <p>Campos con errores:</p>
              <ul className="list-disc pl-4">
                {Object.entries(errors).map(([field, error]) => (
                  <li key={field}>{field}: {error?.message || 'invalid'}</li>
                ))}
              </ul>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )

}
