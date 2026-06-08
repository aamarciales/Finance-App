import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import type { Debt, DebtType } from '@/types/domain'
import type { DebtFormData } from '@/hooks/useDebts'

const DEBT_TYPES: { value: DebtType; label: string }[] = [
  { value: 'credit_card', label: 'Credit card' },
  { value: 'personal_loan', label: 'Personal loan' },
  { value: 'family_loan', label: 'Family loan' },
  { value: 'mortgage', label: 'Hipoteca' },
  { value: 'other', label: 'Otra' },
]

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  creditor: z.string().min(1, 'Creditor is required'),
  type: z.enum(['credit_card', 'personal_loan', 'family_loan', 'mortgage', 'other']),
  originalAmount: z.number({ message: 'Amount is required' }).positive(),
  currentBalance: z.number().min(0),
  currency: z.enum(CURRENCIES),
  interestRate: z.number().min(0),
  monthlyPayment: z.number().min(0),
  totalInstallments: z.number().min(1),
  paidInstallments: z.number().min(0),
  nextPaymentDate: z.string().min(1),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface DebtFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: DebtFormData) => Promise<void>
  editDebt?: Debt
}

export function DebtFormDialog({ open, onOpenChange, onSubmit, editDebt }: DebtFormDialogProps) {
  const isEditing = !!editDebt

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      creditor: '',
      type: 'credit_card',
      originalAmount: 0,
      currentBalance: 0,
      currency: 'COP',
      interestRate: 0,
      monthlyPayment: 0,
      totalInstallments: 12,
      paidInstallments: 0,
      nextPaymentDate: new Date().toISOString().slice(0, 10),
      notes: '',
    },
  })

  useEffect(() => {
    if (editDebt) {
      reset({
        name: editDebt.name,
        creditor: editDebt.creditor,
        type: editDebt.type,
        originalAmount: editDebt.originalAmount,
        currentBalance: editDebt.currentBalance,
        currency: editDebt.currency,
        interestRate: editDebt.interestRate,
        monthlyPayment: editDebt.monthlyPayment,
        totalInstallments: editDebt.totalInstallments,
        paidInstallments: editDebt.paidInstallments,
        nextPaymentDate: editDebt.nextPaymentDate,
        notes: editDebt.notes ?? '',
      })
    } else {
      reset({
        name: '',
        creditor: '',
        type: 'credit_card',
        originalAmount: 0,
        currentBalance: 0,
        currency: 'COP',
        interestRate: 0,
        monthlyPayment: 0,
        totalInstallments: 12,
        paidInstallments: 0,
        nextPaymentDate: new Date().toISOString().slice(0, 10),
        notes: '',
      })
    }
  }, [editDebt, open, reset])

  async function handleFormSubmit(values: FormValues) {
    await onSubmit({
      ...values,
      notes: values.notes || undefined,
    })
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            {isEditing ? 'Edit debt' : 'New debt'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="grid gap-4 py-2">
          <div className="grid grid-cols-[1fr_1fr] gap-3">
            <div className="grid gap-1.5">
              <Label>Name</Label>
              <Input {...register('name')} placeholder="E.g. Bancolombia card" />
              {errors.name && <p className="text-[12px] text-danger-strong">{errors.name.message}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label>Creditor</Label>
              <Input {...register('creditor')} placeholder="E.g. Bancolombia" />
              {errors.creditor && <p className="text-[12px] text-danger-strong">{errors.creditor.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-[1fr_120px] gap-3">
            <div className="grid gap-1.5">
              <Label>Type</Label>
              <Controller name="type" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEBT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </div>
            <div className="grid gap-1.5">
              <Label>Currency</Label>
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

          <div className="grid grid-cols-[1fr_1fr] gap-3">
            <div className="grid gap-1.5">
              <Label>Original amount</Label>
              <Input type="number" step="any" {...register('originalAmount', { valueAsNumber: true })} className="font-mono" />
              {errors.originalAmount && <p className="text-[12px] text-danger-strong">{errors.originalAmount.message}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label>Current balance</Label>
              <Input type="number" step="any" {...register('currentBalance', { valueAsNumber: true })} className="font-mono" />
            </div>
          </div>

          <div className="grid grid-cols-[1fr_1fr_1fr] gap-3">
            <div className="grid gap-1.5">
              <Label>Interest rate %</Label>
              <Input type="number" step="any" {...register('interestRate', { valueAsNumber: true })} className="font-mono" />
            </div>
            <div className="grid gap-1.5">
              <Label>Monthly payment</Label>
              <Input type="number" step="any" {...register('monthlyPayment', { valueAsNumber: true })} className="font-mono" />
            </div>
            <div className="grid gap-1.5">
              <Label>Next payment</Label>
              <Input type="date" {...register('nextPaymentDate')} />
            </div>
          </div>

          <div className="grid grid-cols-[1fr_1fr] gap-3">
            <div className="grid gap-1.5">
              <Label>Total installments</Label>
              <Input type="number" {...register('totalInstallments', { valueAsNumber: true })} className="font-mono" />
            </div>
            <div className="grid gap-1.5">
              <Label>Installments paid</Label>
              <Input type="number" {...register('paidInstallments', { valueAsNumber: true })} className="font-mono" />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Notes</Label>
            <Input {...register('notes')} placeholder="e.g. Interest-free" />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
