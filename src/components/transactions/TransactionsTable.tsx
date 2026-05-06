import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
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
  ArrowRightLeft,
  Landmark,
  Percent,
  RotateCw,
  Paperclip,
  Pencil,
  Trash2,
  FileSearch,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Money } from '@/components/common/Money'
import { Badge } from '@/components/common/Badge'
import { EmptyState } from '@/components/common/EmptyState'
import type { BadgeTone } from '@/components/common/Badge'
import type { EnrichedTransaction } from '@/hooks/useTransactions'
import { formatTRM } from '@/lib/format'

const ICON_MAP: Record<string, LucideIcon> = {
  'shopping-cart': ShoppingCart,
  utensils: Utensils,
  car: Car,
  globe: Globe,
  'heart-pulse': HeartPulse,
  'book-open': BookOpen,
  home: Home,
  shield: Shield,
  heart: Heart,
  'credit-card': CreditCard,
  'file-text': FileText,
  'more-horizontal': MoreHorizontal,
  briefcase: Briefcase,
  wallet: Wallet,
  'plus-circle': PlusCircle,
  'arrow-right-left': ArrowRightLeft,
  landmark: Landmark,
  percent: Percent,
}

const CATEGORY_TONE_MAP: Record<string, BadgeTone> = {
  Supermercado: 'green',
  'Comida fuera': 'gold',
  Transporte: 'warm',
  Servicios: 'info',
  Salud: 'info',
  'Educación': 'info',
  Hogar: 'gray',
  Diezmo: 'gold',
  Ofrendas: 'gold',
  Deuda: 'danger',
  Impuestos: 'gray',
  Otros: 'gray',
  Freelance: 'green',
  Sueldo: 'green',
  'Otros ingresos': 'gray',
  Transferencias: 'gray',
  'Comisiones bancarias': 'warm',
  'Intereses bancarios': 'danger',
}

function getTone(categoryName: string): BadgeTone {
  return CATEGORY_TONE_MAP[categoryName] ?? 'gray'
}

interface TransactionsTableProps {
  transactions: EnrichedTransaction[]
  onEdit: (tx: EnrichedTransaction) => void
  onDelete: (tx: EnrichedTransaction) => void
  onViewInvoice?: (invoiceId: number) => void
}

export function TransactionsTable({ transactions, onEdit, onDelete, onViewInvoice }: TransactionsTableProps) {
  if (transactions.length === 0) {
    return (
      <EmptyState
        title="Sin transacciones"
        description="No hay movimientos para los filtros seleccionados"
      />
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[13px]">
        <thead>
          <tr className="border-b border-border text-[11px] uppercase tracking-[0.08em] text-text-faint">
            <th className="px-4 py-2.5 font-medium">Fecha</th>
            <th className="px-4 py-2.5 font-medium">Concepto</th>
            <th className="px-4 py-2.5 font-medium">Categoría</th>
            <th className="px-4 py-2.5 text-right font-medium">Monto</th>
            <th className="px-4 py-2.5 text-right font-medium">Equivalente</th>
            <th className="hidden px-4 py-2.5 text-right font-medium md:table-cell">TRM</th>
            <th className="px-4 py-2.5 text-right font-medium">Factura</th>
            <th className="px-4 py-2.5 text-right font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <TxRow key={tx.id} tx={tx} onEdit={onEdit} onDelete={onDelete} onViewInvoice={onViewInvoice} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TxRow({
  tx,
  onEdit,
  onDelete,
  onViewInvoice,
}: {
  tx: EnrichedTransaction
  onEdit: (tx: EnrichedTransaction) => void
  onDelete: (tx: EnrichedTransaction) => void
  onViewInvoice?: (invoiceId: number) => void
}) {
  const isIncome = tx.type === 'income'

  let dateLabel = '—'
  if (tx.date) {
    const d = parseISO(tx.date)
    if (!isNaN(d.getTime())) {
      dateLabel = format(d, 'dd MMM', { locale: es })
    }
  }

  const CategoryIcon = ICON_MAP[tx.category.icon]

  const equivalentAmount = tx.currency === 'USD' ? tx.amountInSecondary : tx.amountInBase
  const equivalentCurrency = tx.currency === 'USD' ? 'COP' : 'USD'

  return (
    <tr className="group border-b border-border/50 transition-colors hover:bg-surface-2/60">
      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-text-muted">
        {dateLabel}
      </td>
      <td className="px-4 py-2.5">
        <span className="inline-flex items-center gap-1">
          {tx.concept}
          {tx.attachmentIds && tx.attachmentIds.length > 0 && (
            <Paperclip className="h-3.5 w-3.5 text-text-faint" />
          )}
        </span>
      </td>
      <td className="px-4 py-2.5">
        <span className="inline-flex items-center gap-1.5">
          {CategoryIcon && (
            <CategoryIcon
              className="h-3.5 w-3.5"
              style={{ color: tx.category.color }}
            />
          )}
          <Badge tone={getTone(tx.category.name)}>{tx.category.name}</Badge>
          {tx.isRecurring && (
            <RotateCw className="h-3 w-3 text-text-faint" />
          )}
        </span>
      </td>
      <td className="whitespace-nowrap px-4 py-2.5 text-right">
        <Money
          amount={isIncome ? tx.amount : -tx.amount}
          currency={tx.currency}
          variant="tabular"
          className={isIncome ? 'text-brand' : ''}
        />
      </td>
      <td className="whitespace-nowrap px-4 py-2.5 text-right">
        <Money
          amount={isIncome ? equivalentAmount : -equivalentAmount}
          currency={equivalentCurrency}
          variant="tabular"
          className="text-text-faint"
        />
      </td>
      <td className="hidden whitespace-nowrap px-4 py-2.5 text-right font-mono text-[11px] text-text-faint md:table-cell">
        {formatTRM(tx.trm)}
      </td>
      <td className="whitespace-nowrap px-4 py-2.5 text-right">
        {tx.invoiceId ? (
          <button
            type="button"
            onClick={() => onViewInvoice?.(tx.invoiceId!)}
            className="inline-flex items-center gap-1 text-[12px] text-brand transition-colors hover:text-brand/80"
          >
            <FileSearch className="h-3 w-3" /> Ver factura
          </button>
        ) : null}
      </td>
      <td className="px-4 py-2.5 text-right">
        <span className="inline-flex items-center justify-end gap-1">
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md transition-opacity hover:bg-surface-2 md:opacity-0 md:group-hover:opacity-100"
            onClick={() => onEdit(tx)}
            aria-label="Editar"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md transition-opacity hover:bg-surface-2 md:opacity-0 md:group-hover:opacity-100"
            onClick={() => onDelete(tx)}
            aria-label="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </span>
      </td>
    </tr>
  )
}
