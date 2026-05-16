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
import type { TitheCommitment } from '@/types/domain'
import type { RegisterPaymentData } from '@/hooks/useTitheCommitments'

const schema = z.object({
  date: z.string().min(1),
  amountUsd: z.number().positive(),
  destination: z.string().min(1),
  attachmentUrl: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface TithePaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  commitments: TitheCommitment[]
  trm: number
  onSubmit: (data: RegisterPaymentData) => Promise<unknown>
}

export function TithePaymentDialog({ open, onOpenChange, commitments, trm, onSubmit }: TithePaymentDialogProps) {
  const totalUsd = commitments.reduce((s, c) => s + c.totalAmount, 0)
  const totalCop = Math.round(totalUsd * trm)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      amountUsd: totalUsd,
      destination: 'Iglesia local',
      attachmentUrl: '',
      notes: '',
    },
  })

  async function handleForm(data: FormValues) {
    try {
      await onSubmit({
        date: data.date,
        commitmentIds: commitments.map(c => c.id!),
        amountUsd: data.amountUsd,
        amountCop: totalCop,
        currency: 'USD',
        trm,
        destination: data.destination,
        attachmentUrl: data.attachmentUrl || undefined,
        notes: data.notes || undefined,
      })
      toast.success(`${commitments.length} compromiso${commitments.length > 1 ? 's' : ''} registrado${commitments.length > 1 ? 's' : ''}`)
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al registrar entrega')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Registrar entrega</DialogTitle>
          <DialogDescription>
            {commitments.length} compromiso{commitments.length > 1 ? 's' : ''} seleccionado{commitments.length > 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleForm)} className="grid gap-4">
          {/* Commitments summary */}
          <div className="rounded-lg bg-surface-2 px-4 py-3 space-y-1">
            {commitments.map(c => (
              <div key={c.id} className="flex justify-between text-[12px]">
                <span className="text-text-muted">{c.date} — USD {c.incomeAmountBase.toFixed(2)}</span>
                <span className="font-mono font-medium">USD {c.totalAmount.toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t border-border pt-1 mt-1 flex justify-between text-[13px] font-medium">
              <span>Total</span>
              <span className="font-mono">USD {totalUsd.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Fecha de entrega</Label>
            <Input type="date" {...register('date')} />
            {errors.date && <p className="text-[12px] text-danger-strong">{errors.date.message}</p>}
          </div>

          <div className="grid gap-1.5">
            <Label>Monto USD (editable)</Label>
            <Input type="number" step="any" {...register('amountUsd', { valueAsNumber: true })} className="font-mono" />
            {errors.amountUsd && <p className="text-[12px] text-danger-strong">{errors.amountUsd.message}</p>}
            <p className="text-[11px] text-text-muted">~${totalCop.toLocaleString('es-CO')} COP</p>
          </div>

          <div className="grid gap-1.5">
            <Label>Destino</Label>
            <Input {...register('destination')} />
          </div>

          <div className="grid gap-1.5">
            <Label>Soporte (URL)</Label>
            <Input {...register('attachmentUrl')} placeholder="https://..." />
          </div>

          <div className="grid gap-1.5">
            <Label>Notas</Label>
            <Input {...register('notes')} placeholder="Opcional" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando…' : 'Confirmar entrega'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
