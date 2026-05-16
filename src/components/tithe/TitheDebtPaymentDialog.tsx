import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
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
import type { RegisterDebtPaymentData } from '@/hooks/useTitheCommitments'

const schema = z.object({
  date: z.string().min(1),
  amountUsd: z.number().positive('Monto requerido'),
})

type FormValues = z.infer<typeof schema>

interface TitheDebtPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  remainingDebt: number
  trm: number
  onSubmit: (data: RegisterDebtPaymentData) => Promise<unknown>
}

export function TitheDebtPaymentDialog({ open, onOpenChange, remainingDebt, trm, onSubmit }: TitheDebtPaymentDialogProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      amountUsd: 0,
    },
  })

  async function handleForm(data: FormValues) {
    try {
      await onSubmit({
        date: data.date,
        amountUsd: data.amountUsd,
        currency: 'USD',
        trm,
      })
      toast.success(`Abono de USD ${data.amountUsd.toFixed(2)} registrado`)
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al registrar abono')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Registrar abono</DialogTitle>
          <DialogDescription>
            Deuda espiritual pendiente: USD {remainingDebt.toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleForm)} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Fecha</Label>
            <Input type="date" {...register('date')} />
            {errors.date && <p className="text-[12px] text-danger-strong">{errors.date.message}</p>}
          </div>

          <div className="grid gap-1.5">
            <Label>Monto USD</Label>
            <Input type="number" step="any" {...register('amountUsd', { valueAsNumber: true })} className="font-mono" />
            {errors.amountUsd && <p className="text-[12px] text-danger-strong">{errors.amountUsd.message}</p>}
            <p className="text-[11px] text-text-muted">~${Math.round((remainingDebt) * trm).toLocaleString('es-CO')} COP pendientes</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando…' : 'Registrar abono'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
