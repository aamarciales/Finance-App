import { useForm } from 'react-hook-form'
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
import { Money } from '@/components/common/Money'
import type { Debt } from '@/types/domain'
import type { DebtPaymentData } from '@/hooks/useDebts'

const schema = z.object({
  date: z.string().min(1),
  amount: z.number({ message: 'Monto obligatorio' }).positive(),
  capitalAmount: z.number().min(0),
  interestAmount: z.number().min(0),
})

type FormValues = z.infer<typeof schema>

interface DebtPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  debt: Debt
  onPay: (debtId: number, data: DebtPaymentData) => Promise<void>
}

export function DebtPaymentDialog({ open, onOpenChange, debt, onPay }: DebtPaymentDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      amount: debt.monthlyPayment,
      capitalAmount: debt.monthlyPayment,
      interestAmount: 0,
    },
  })

  const amount = watch('amount')
  const interestAmount = watch('interestAmount')
  const autoCapital = Math.max(0, (amount || 0) - (interestAmount || 0))

  async function handleFormSubmit(values: FormValues) {
    await onPay(debt.id!, {
      date: values.date,
      amount: values.amount,
      capitalAmount: values.capitalAmount,
      interestAmount: values.interestAmount,
    })
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Pagar cuota · {debt.name}</DialogTitle>
        </DialogHeader>

        <div className="mb-3 rounded-md bg-surface-2 px-3 py-2 text-[13px]">
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Saldo actual</span>
            <Money amount={debt.currentBalance} currency={debt.currency} variant="inline" className="font-mono" />
          </div>
          {debt.interestRate > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Tasa interés</span>
              <span className="font-mono">{debt.interestRate}% EA</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Fecha</Label>
            <Input type="date" {...register('date')} />
          </div>

          <div className="grid gap-1.5">
            <Label>Monto total</Label>
            <Input
              type="number"
              step="any"
              {...register('amount', { valueAsNumber: true })}
              className="font-mono"
              autoFocus
            />
            {errors.amount && <p className="text-[12px] text-danger-strong">{errors.amount.message}</p>}
          </div>

          <div className="grid grid-cols-[1fr_1fr] gap-3">
            <div className="grid gap-1.5">
              <Label>Intereses</Label>
              <Input
                type="number"
                step="any"
                {...register('interestAmount', { valueAsNumber: true })}
                className="font-mono"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Capital</Label>
              <Input
                type="number"
                step="any"
                {...register('capitalAmount', { valueAsNumber: true })}
                className="font-mono"
                value={autoCapital || ''}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Procesando…' : 'Pagar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
