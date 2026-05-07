import { z } from 'zod'
import type { TxType } from '@/types/domain'

export const VISIBLE_TYPES = ['expense', 'income'] as const
export const INTERNAL_TX_TYPES: TxType[] = ['expense', 'income', 'debt_payment', 'transfer']

export const CURRENCIES = ['COP', 'USD', 'EUR'] as const

export const VISIBLE_TYPE_LABELS: Record<string, string> = {
  expense: 'Gasto',
  income: 'Ingreso',
}

/** Given the category name and the visible type selected by the user, resolve the internal TxType. */
export function resolveInternalType(categoryName: string, visibleType: 'expense' | 'income'): TxType {
  if (visibleType === 'expense') {
    if (categoryName === 'Deuda') return 'debt_payment'
    if (categoryName === 'Transferencias') return 'transfer'
  }
  return visibleType
}

export const txFormSchema = z.object({
  type: z.enum(VISIBLE_TYPES, { message: 'Selecciona un tipo' }),
  date: z.string().min(1, 'La fecha es obligatoria'),
  concept: z
    .string()
    .min(1, 'El concepto es obligatorio')
    .max(200, 'Máximo 200 caracteres'),
  categoryId: z.number({ message: 'Selecciona una categoría' }).positive(),
  amount: z
    .number({ message: 'El monto es obligatorio' })
    .positive('Debe ser mayor a 0'),
  currency: z.enum(CURRENCIES),
  trm: z.number().positive(),
  notes: z.string().nullable().optional(),
  isRecurring: z.boolean().nullable().optional(),
  debtId: z.number().positive().nullable().optional(),
  capitalAmount: z.number().min(0).nullable().optional(),
  interestAmount: z.number().min(0).nullable().optional(),
})

export type TxFormValues = z.infer<typeof txFormSchema>

export const categoryFormSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color hex inválido'),
  icon: z.string().min(1, 'El icono es obligatorio'),
  type: z.enum(['expense', 'income']),
})

export type CategoryFormValues = z.infer<typeof categoryFormSchema>
