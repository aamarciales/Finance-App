import { z } from 'zod'
import type { TxType } from '@/types/domain'

const titheExemptionSchema = z.enum(['exempt', 'already_tithed', 'loan_proceeds']).nullable().optional()

export const VISIBLE_TYPES = ['expense', 'income'] as const
export const INTERNAL_TX_TYPES: TxType[] = ['expense', 'income', 'debt_payment', 'transfer']

export const CURRENCIES = ['COP', 'USD', 'EUR'] as const

export const VISIBLE_TYPE_LABELS: Record<string, string> = {
  expense: 'Expense',
  income: 'Income',
}

/** Given the category name and the visible type selected by the user, resolve the internal TxType. */
export function resolveInternalType(categoryName: string, visibleType: 'expense' | 'income'): TxType {
  if (visibleType === 'expense') {
    if (categoryName === 'Deuda' || categoryName === 'Debt') return 'debt_payment'
    if (categoryName === 'Transferencias') return 'transfer'
  }
  return visibleType
}

export const txFormSchema = z.object({
  type: z.enum(VISIBLE_TYPES, { message: 'Select a type' }),
  date: z.string().min(1, 'Date is required'),
  concept: z
    .string()
    .min(1, 'Description is required')
    .max(200, 'Maximum 200 characters'),
  categoryId: z.number({ message: 'Select a category' }).positive(),
  amount: z
    .number({ message: 'Amount is required' })
    .positive('Must be greater than 0'),
  currency: z.enum(CURRENCIES),
  trm: z.number().positive(),
  notes: z.string().nullable().optional(),
  isRecurring: z.boolean().nullable().optional(),
  debtId: z.number().positive().nullable().optional(),
  capitalAmount: z.number().min(0).nullable().optional(),
  interestAmount: z.number().min(0).nullable().optional(),
  attachments: z.array(z.string()).nullable().optional(),
  accountId: z.string().nullable().optional(),
  actualAmount: z.number().nullable().optional(),
  titheExemption: titheExemptionSchema,
})

export type TxFormValues = z.infer<typeof txFormSchema>

export const categoryFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color'),
  icon: z.string().min(1, 'Icon is required'),
  type: z.enum(['expense', 'income']),
})

export type CategoryFormValues = z.infer<typeof categoryFormSchema>
