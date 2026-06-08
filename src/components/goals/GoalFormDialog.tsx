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
import type { Goal } from '@/types/domain'
import type { GoalFormData } from '@/hooks/useGoals'

const goalSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  iconKey: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  targetAmount: z.number({ message: 'Amount is required' }).positive(),
  currentAmount: z.number().min(0),
  currency: z.enum(CURRENCIES),
  monthlyContribution: z.number().min(0).optional(),
  targetDate: z.string().optional(),
})

type GoalFormValues = z.infer<typeof goalSchema>

interface GoalFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: GoalFormData) => Promise<void>
  editGoal?: Goal
}

const ICONS = [
  { value: 'shield', label: 'Protection' },
  { value: 'plane', label: 'Viaje' },
  { value: 'laptop', label: 'Technology' },
  { value: 'home', label: 'Hogar' },
  { value: 'car', label: 'Vehicle' },
  { value: 'graduation-cap', label: 'Education' },
  { value: 'heart', label: 'Salud' },
  { value: 'briefcase', label: 'Negocio' },
  { value: 'gem', label: 'Lujo' },
  { value: 'piggy-bank', label: 'Ahorro' },
]

const COLORS = [
  '#2d4a3e', '#4a6e8a', '#7a4a6e', '#b8923a', '#c4621d',
  '#5a4ea0', '#4a8a6e', '#8a6a4a', '#a83e2b', '#6b7280',
]

export function GoalFormDialog({ open, onOpenChange, onSubmit, editGoal }: GoalFormDialogProps) {
  const isEditing = !!editGoal

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: '',
      description: '',
      iconKey: 'shield',
      color: '#2d4a3e',
      targetAmount: 0,
      currentAmount: 0,
      currency: 'USD',
      monthlyContribution: 0,
      targetDate: '',
    },
  })

  useEffect(() => {
    if (editGoal) {
      reset({
        name: editGoal.name,
        description: editGoal.description ?? '',
        iconKey: editGoal.iconKey,
        color: editGoal.color,
        targetAmount: editGoal.targetAmount,
        currentAmount: editGoal.currentAmount,
        currency: editGoal.currency,
        monthlyContribution: editGoal.monthlyContribution ?? 0,
        targetDate: editGoal.targetDate ?? '',
      })
    } else {
      reset({
        name: '',
        description: '',
        iconKey: 'shield',
        color: '#2d4a3e',
        targetAmount: 0,
        currentAmount: 0,
        currency: 'USD',
        monthlyContribution: 0,
        targetDate: '',
      })
    }
  }, [editGoal, open, reset])

  async function handleFormSubmit(values: GoalFormValues) {
    await onSubmit({
      ...values,
      description: values.description || undefined,
      monthlyContribution: values.monthlyContribution || undefined,
      targetDate: values.targetDate || undefined,
    })
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            {isEditing ? 'Edit goal' : 'New goal'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Name</Label>
            <Input {...register('name')} placeholder="E.g. Emergency fund" />
            {errors.name && <p className="text-[12px] text-danger-strong">{errors.name.message}</p>}
          </div>

          <div className="grid gap-1.5">
            <Label>Description</Label>
            <Input {...register('description')} placeholder="E.g. 6 months of expenses" />
          </div>

          <div className="grid grid-cols-[1fr_120px] gap-3">
            <div className="grid gap-1.5">
              <Label>Target amount</Label>
              <Input
                type="number"
                step="any"
                {...register('targetAmount', { valueAsNumber: true })}
                className="font-mono"
              />
              {errors.targetAmount && <p className="text-[12px] text-danger-strong">{errors.targetAmount.message}</p>}
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

          <div className="grid grid-cols-[1fr_120px] gap-3">
            <div className="grid gap-1.5">
              <Label>Ahorro actual</Label>
              <Input
                type="number"
                step="any"
                {...register('currentAmount', { valueAsNumber: true })}
                className="font-mono"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Aporte/mes</Label>
              <Input
                type="number"
                step="any"
                {...register('monthlyContribution', { valueAsNumber: true })}
                className="font-mono"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Target date</Label>
            <Input type="date" {...register('targetDate')} />
          </div>

          <div className="grid gap-1.5">
            <Label>Icon</Label>
            <Controller name="iconKey" control={control} render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ICONS.map(ic => <SelectItem key={ic.value} value={ic.value}>{ic.label}</SelectItem>)}
                </SelectContent>
              </Select>
            )} />
          </div>

          <div className="grid gap-1.5">
            <Label>Color</Label>
            <Controller name="color" control={control} render={({ field }) => (
              <div className="flex gap-2">
                {COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`h-7 w-7 rounded-full transition-transform ${field.value === c ? 'scale-110 ring-2 ring-offset-2 ring-border' : ''}`}
                    style={{ backgroundColor: c }}
                    onClick={() => field.onChange(c)}
                  />
                ))}
              </div>
            )} />
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
