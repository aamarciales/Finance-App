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
import type { Goal } from '@/types/domain'

const schema = z.object({
  amount: z.number({ message: 'Amount is required' }).positive('Must be greater than 0'),
})

type FormValues = z.infer<typeof schema>

interface GoalContributeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal: Goal
  onContribute: (goalId: number, amount: number) => Promise<void>
}

export function GoalContributeDialog({ open, onOpenChange, goal, onContribute }: GoalContributeDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { amount: goal.monthlyContribution ?? 0 },
  })

  const remaining = goal.targetAmount - goal.currentAmount

  async function handleFormSubmit(values: FormValues) {
    await onContribute(goal.id!, values.amount)
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Contribute to "{goal.name}"</DialogTitle>
        </DialogHeader>

        <div className="mb-3 rounded-md bg-surface-2 px-3 py-2 text-[13px]">
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Current</span>
            <Money amount={goal.currentAmount} currency={goal.currency} variant="inline" className="font-mono" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Remaining</span>
            <Money amount={Math.max(0, remaining)} currency={goal.currency} variant="inline" className="font-mono" />
          </div>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Amount to contribute</Label>
            <Input
              type="number"
              step="any"
              max={remaining > 0 ? remaining : undefined}
              {...register('amount', { valueAsNumber: true })}
              className="font-mono"
              autoFocus
            />
            {errors.amount && <p className="text-[12px] text-danger-strong">{errors.amount.message}</p>}
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Contribute'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
