import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check } from 'lucide-react'
import {
  ShoppingCart,
  Utensils,
  Car,
  Globe,
  HeartPulse,
  BookOpen,
  Home,
  Shield,
  Heart,
  CreditCard,
  FileText,
  MoreHorizontal,
  Briefcase,
  Wallet,
  PlusCircle,
  Plane,
  Laptop,
  Music,
  Gift,
  Coffee,
  ArrowRightLeft,
  Landmark,
  Percent,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
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
import { categoryFormSchema, type CategoryFormValues } from '@/lib/validators'

const ICON_KEYS = [
  'shopping-cart',
  'utensils',
  'car',
  'globe',
  'heart-pulse',
  'book-open',
  'home',
  'shield',
  'heart',
  'credit-card',
  'file-text',
  'more-horizontal',
  'briefcase',
  'wallet',
  'plus-circle',
  'plane',
  'laptop',
  'music',
  'gift',
  'coffee',
  'arrow-right-left',
  'landmark',
  'percent',
] as const

const ICON_MAP: Record<string, LucideIcon> = {
  'shopping-cart': ShoppingCart,
  'utensils': Utensils,
  'car': Car,
  'globe': Globe,
  'heart-pulse': HeartPulse,
  'book-open': BookOpen,
  'home': Home,
  'shield': Shield,
  'heart': Heart,
  'credit-card': CreditCard,
  'file-text': FileText,
  'more-horizontal': MoreHorizontal,
  'briefcase': Briefcase,
  'wallet': Wallet,
  'plus-circle': PlusCircle,
  'plane': Plane,
  'laptop': Laptop,
  'music': Music,
  'gift': Gift,
  'coffee': Coffee,
  'arrow-right-left': ArrowRightLeft,
  'landmark': Landmark,
  'percent': Percent,
}

const COLORS = [
  '#2d4a3e',
  '#b8923a',
  '#c4621d',
  '#a83e2b',
  '#5a4ea0',
  '#4a6e8a',
  '#7a4a6e',
  '#8a6a4a',
  '#2d5e4a',
  '#d4b974',
  '#6b9080',
  '#9a978d',
]

interface CategoryFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: CategoryFormValues) => Promise<void>
  editCategory?: {
    id?: number
    name: string
    color: string
    icon: string
    type: 'expense' | 'income'
  }
}

export function CategoryFormDialog({
  open,
  onOpenChange,
  onSubmit,
  editCategory,
}: CategoryFormDialogProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: editCategory
      ? {
          name: editCategory.name,
          color: editCategory.color,
          icon: editCategory.icon,
          type: editCategory.type,
        }
      : {
          name: '',
          color: '#2d4a3e',
          icon: 'more-horizontal',
          type: 'expense',
        },
  })

  useEffect(() => {
    if (editCategory) {
      reset({
        name: editCategory.name,
        color: editCategory.color,
        icon: editCategory.icon,
        type: editCategory.type,
      })
    } else {
      reset({ name: '', color: '#2d4a3e', icon: 'more-horizontal', type: 'expense' })
    }
  }, [editCategory, open, reset])

  const selectedColor = watch('color')

  async function handleFormSubmit(values: CategoryFormValues) {
    await onSubmit(values)
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            {editCategory ? 'Editar categoría' : 'Nueva categoría'}
          </DialogTitle>
        </DialogHeader>

        <form
          key={editCategory?.id ?? 'new'}
          onSubmit={handleSubmit(handleFormSubmit)}
          className="grid gap-4 py-2"
        >
          <div className="grid gap-1.5">
            <Label>Nombre</Label>
            <Input {...register('name')} placeholder="Ej. Suscripciones" />
            {errors.name && (
              <p className="text-[12px] text-danger-strong">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Tipo</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Gasto</SelectItem>
                      <SelectItem value="income">Ingreso</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Color</Label>
            <Controller
              name="color"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-6 gap-2">
                  {COLORS.map((color) => {
                    const isSelected = field.value === color
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => field.onChange(color)}
                        className="relative flex h-8 w-8 items-center justify-center rounded-lg transition"
                        style={{
                          backgroundColor: color,
                          boxShadow: isSelected
                            ? `0 0 0 2px var(--background), 0 0 0 4px ${color}`
                            : undefined,
                        }}
                      >
                        {isSelected && (
                          <Check className="h-4 w-4 text-white" />
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Icono</Label>
            <Controller
              name="icon"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-5 gap-2">
                  {ICON_KEYS.map((iconKey) => {
                    const IconComponent = ICON_MAP[iconKey]
                    const isSelected = field.value === iconKey
                    return (
                      <button
                        key={iconKey}
                        type="button"
                        onClick={() => field.onChange(iconKey)}
                        className={`flex h-11 w-11 items-center justify-center rounded-lg border cursor-pointer transition ${
                          isSelected
                            ? `ring-2 border-transparent`
                            : 'border-border'
                        }`}
                        style={
                          isSelected
                            ? {
                                backgroundColor: `${selectedColor}1a`,
                                borderColor: 'transparent',
                                boxShadow: `0 0 0 2px ${selectedColor}`,
                              }
                            : undefined
                        }
                      >
                        {IconComponent && (
                          <IconComponent
                            className="h-5 w-5"
                            style={{
                              color: isSelected ? selectedColor : undefined,
                            }}
                          />
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
