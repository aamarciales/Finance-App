import { useState, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { displayLocale } from '../lib/locale'
import { Plus, Trash2, Pencil, CreditCard, HandCoins } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { Money } from '@/components/common/Money'
import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { DebtFormDialog } from '@/components/debts/DebtFormDialog'
import { DebtPaymentDialog } from '@/components/debts/DebtPaymentDialog'
import { useDebts, type DebtFormData } from '@/hooks/useDebts'
import { useTRM } from '@/hooks/useTRM'
import { useForex } from '@/hooks/useForex'
import type { Debt, DebtType } from '@/types/domain'

const DEBT_TYPE_LABELS: Record<DebtType, string> = {
  credit_card: 'Credit card',
  personal_loan: 'Personal loan',
  family_loan: 'Family loan',
  mortgage: 'Mortgage',
  other: 'Other',
}

const DEBT_TYPE_BADGE: Record<DebtType, 'danger' | 'warm' | 'gray' | 'info' | 'gold'> = {
  credit_card: 'danger',
  personal_loan: 'warm',
  family_loan: 'gray',
  mortgage: 'info',
  other: 'gold',
}

export default function DebtsPage() {
  const { rate: trm } = useTRM()
  const { eurToUsd } = useForex()
  const rates = useMemo(() => ({ trm, eurToUsd }), [trm, eurToUsd])

  const { debts, loading, addDebt, updateDebt, deleteDebt, registerPayment } = useDebts(rates)
  const [formOpen, setFormOpen] = useState(false)
  const [editDebt, setEditDebt] = useState<Debt | null>(null)
  const [payDebt, setPayDebt] = useState<Debt | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Debt | null>(null)

  async function handleCreate(data: DebtFormData) {
    await addDebt(data)
  }

  async function handleEdit(data: DebtFormData) {
    if (!editDebt?.id) return
    await updateDebt(editDebt.id, data)
    setEditDebt(null)
  }

  async function handleDelete() {
    if (!deleteTarget?.id) return
    await deleteDebt(deleteTarget.id)
    setDeleteTarget(null)
  }

  const activeDebts = debts.filter(d => !d.isPaid)
  const paidDebts = debts.filter(d => d.isPaid)

  return (
    <>
      <PageHeader
        title="Debts"
        subtitle="Balances, interest, and payment schedule"
        actions={
          <Button onClick={() => setFormOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            New debt
          </Button>
        }
      />

      {loading ? (
        <div className="py-10 text-center text-text-muted">Loading…</div>
      ) : debts.length === 0 ? (
        <EmptyState
          title="No active debts"
          description="Add debts to track payments and balances"
          icon={<CreditCard className="h-8 w-8 text-text-faint" />}
          action={
            <Button onClick={() => setFormOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Add debt
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {activeDebts.length > 0 && (
            <div>
              <h3 className="mb-3 text-[11px] uppercase tracking-[0.08em] text-text-muted">
                Active ({activeDebts.length})
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {activeDebts.map(debt => (
                  <DebtCard
                    key={debt.id}
                    debt={debt}
                    onEdit={() => setEditDebt(debt)}
                    onDelete={() => setDeleteTarget(debt)}
                    onPay={() => setPayDebt(debt)}
                  />
                ))}
              </div>
            </div>
          )}

          {paidDebts.length > 0 && (
            <div>
              <h3 className="mb-3 text-[11px] uppercase tracking-[0.08em] text-text-muted">
                Paid off ({paidDebts.length})
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {paidDebts.map(debt => (
                  <DebtCard
                    key={debt.id}
                    debt={debt}
                    onEdit={() => setEditDebt(debt)}
                    onDelete={() => setDeleteTarget(debt)}
                    onPay={() => {}}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create */}
      <DebtFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
      />

      {/* Edit */}
      <DebtFormDialog
        open={!!editDebt}
        onOpenChange={(open) => { if (!open) setEditDebt(null) }}
        onSubmit={handleEdit}
        editDebt={editDebt ?? undefined}
      />

      {/* Pay */}
      {payDebt && (
        <DebtPaymentDialog
          open={!!payDebt}
          onOpenChange={(open) => { if (!open) setPayDebt(null) }}
          debt={payDebt}
          onPay={registerPayment}
        />
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete debt "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              The debt will be deleted. Recorded payments will not be changed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function DebtCard({ debt, onEdit, onDelete, onPay }: {
  debt: Debt
  onEdit: () => void
  onDelete: () => void
  onPay: () => void
}) {
  const progress = debt.originalAmount > 0
    ? Math.min(100, ((debt.originalAmount - debt.currentBalance) / debt.originalAmount) * 100)
    : 0

  let nextPaymentLabel = ''
  if (debt.nextPaymentDate) {
    const d = parseISO(debt.nextPaymentDate)
    if (!isNaN(d.getTime())) nextPaymentLabel = format(d, 'dd MMM yyyy', { locale: displayLocale })
  }

  return (
    <div
      className={`group rounded-[10px] border border-border bg-surface p-5 transition-colors hover:bg-surface-2/40 ${debt.isPaid ? 'opacity-60' : ''}`}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-medium">{debt.name}</span>
            {debt.isPaid && <Badge tone="green">Paid off</Badge>}
          </div>
          <div className="text-[12px] text-text-muted">
            {debt.creditor}
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <Badge tone={DEBT_TYPE_BADGE[debt.type]}>
            {DEBT_TYPE_LABELS[debt.type]}
          </Badge>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="h-2 rounded-full bg-surface-2">
          <div
            className="h-2 rounded-full transition-all"
            style={{
              width: `${progress}%`,
              backgroundColor: debt.isPaid ? 'var(--brand)' : 'var(--warm)',
            }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[12px] text-text-muted">
          <span>{progress.toFixed(0)}% paid</span>
          <span>Installment {debt.paidInstallments}/{debt.totalInstallments}</span>
        </div>
      </div>

      {/* Amounts */}
      <div className="mb-3 space-y-1">
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-text-muted">Balance</span>
          <Money amount={debt.currentBalance} currency={debt.currency} variant="inline" className="font-mono font-medium" />
        </div>
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-text-muted">Original</span>
          <span className="font-mono text-text-muted">
            <Money amount={debt.originalAmount} currency={debt.currency} variant="inline" />
          </span>
        </div>
        {debt.interestRate > 0 && (
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-text-muted">Interest</span>
            <span className="font-mono">{debt.interestRate}% EA</span>
          </div>
        )}
        {nextPaymentLabel && !debt.isPaid && (
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-text-muted">Next payment</span>
            <span className="font-mono text-[12px]">{nextPaymentLabel}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      {!debt.isPaid && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="flex-1 gap-1.5 h-9"
            onClick={onPay}
          >
            <HandCoins className="h-4 w-4" /> Pay installment
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={onEdit}
            aria-label="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-danger-strong hover:text-danger-strong"
            onClick={onDelete}
            aria-label="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
