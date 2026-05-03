import { useCallback, useMemo, useState } from 'react'
import { Plus, Globe } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { TxTabs } from '@/components/transactions/TxTabs'
import { TxFilters, periodToDates } from '@/components/transactions/TxFilters'
import { TransactionsTable } from '@/components/transactions/TransactionsTable'
import { TxFormDialog } from '@/components/transactions/TxFormDialog'
import { IntlPaymentWizard } from '@/components/transactions/IntlPaymentWizard'
import { InvoiceQuickView } from '@/components/invoices/InvoiceQuickView'
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
import { useTransactions, type TabFilter, type EnrichedTransaction } from '@/hooks/useTransactions'
import { useTRM } from '@/hooks/useTRM'
import { useForex } from '@/hooks/useForex'
import { logChange } from '@/hooks/useAuditLog'
import { resolveInternalType, type TxFormValues } from '@/lib/validators'
import type { Transaction } from '@/types/domain'

export default function TransactionsPage() {
  const [tab, setTab] = useState<TabFilter>('all')
  const [period, setPeriod] = useState('this-month')
  const [categoryId, setCategoryId] = useState('all')
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [editTx, setEditTx] = useState<Transaction | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<EnrichedTransaction | null>(null)
  const [viewingInvoiceId, setViewingInvoiceId] = useState<number | null>(null)

  const dateRange = useMemo(() => periodToDates(period), [period])
  const { rate: trm } = useTRM()
  const { eurToUsd } = useForex()
  const rates = useMemo(() => ({ trm, eurToUsd }), [trm, eurToUsd])

  const { transactions, categories, loading, addTransaction, updateTransaction, deleteTransaction } = useTransactions(
    {
      tab,
      periodStart: dateRange.start,
      periodEnd: dateRange.end,
      categoryId: categoryId !== 'all' ? Number(categoryId) : undefined,
      search: search || undefined,
    },
    rates,
  )

  const handleCreate = useCallback(
    async (values: TxFormValues) => {
      const cat = categories.find((c) => c.id === values.categoryId)
      const internalType = resolveInternalType(cat?.name ?? '', values.type)
      const txId = await addTransaction({
        date: values.date,
        type: internalType,
        concept: values.concept,
        categoryId: values.categoryId,
        amount: values.amount,
        currency: values.currency,
        trm: values.trm,
        notes: values.notes || undefined,
        isRecurring: values.isRecurring || undefined,
        debtId: values.debtId || undefined,
        capitalAmount: values.capitalAmount,
        interestAmount: values.interestAmount,
      }) as number
      await logChange({
        entityType: 'transaction',
        entityId: txId,
        operation: 'create',
        afterState: { ...values, type: internalType },
        description: `Nueva transacción: ${values.concept}`,
      })
      toast.success('Transacción creada')
    },
    [addTransaction, categories],
  )

  const handleEdit = useCallback(
    async (values: TxFormValues) => {
      if (!editTx?.id) return
      const cat = categories.find((c) => c.id === values.categoryId)
      const internalType = resolveInternalType(cat?.name ?? '', values.type)
      const beforeState = { ...editTx }
      await updateTransaction(editTx.id, {
        date: values.date,
        type: internalType,
        concept: values.concept,
        categoryId: values.categoryId,
        amount: values.amount,
        currency: values.currency,
        trm: values.trm,
        notes: values.notes || undefined,
        isRecurring: values.isRecurring || undefined,
        debtId: values.debtId || undefined,
        capitalAmount: values.capitalAmount,
        interestAmount: values.interestAmount,
      })
      await logChange({
        entityType: 'transaction',
        entityId: editTx.id,
        operation: 'update',
        beforeState,
        afterState: { ...values, type: internalType },
        description: `Editada: ${values.concept}`,
      })
      toast.success('Transacción actualizada')
      setEditTx(undefined)
    },
    [editTx, updateTransaction, categories],
  )

  const handleDelete = useCallback(async () => {
    if (!deleteTarget?.id) return
    await logChange({
      entityType: 'transaction',
      entityId: deleteTarget.id,
      operation: 'delete',
      beforeState: { ...deleteTarget },
      description: `Eliminada: ${deleteTarget.concept}`,
    })
    await deleteTransaction(deleteTarget.id)
    toast.success('Transacción eliminada')
    setDeleteTarget(null)
  }, [deleteTarget, deleteTransaction])

  function openEdit(tx: EnrichedTransaction) {
    setEditTx(tx)
  }

  function closeForm() {
    setFormOpen(false)
    setEditTx(undefined)
  }

  return (
    <>
      <PageHeader
        title="Transacciones"
        subtitle="Todas las entradas y salidas registradas"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setWizardOpen(true)} className="gap-1.5">
              <Globe className="h-4 w-4" />
              Pago internacional
            </Button>
            <Button onClick={() => setFormOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Nueva transacción
            </Button>
          </div>
        }
      />

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TxFilters
            categories={categories}
            period={period}
            onPeriodChange={setPeriod}
            categoryId={categoryId}
            onCategoryChange={setCategoryId}
            search={search}
            onSearchChange={setSearch}
          />
          <TxTabs value={tab} onChange={setTab} />
        </div>

        <div className="rounded-lg border border-border bg-surface">
          {loading ? (
            <div className="p-10 text-center text-text-muted">Cargando…</div>
          ) : (
            <TransactionsTable
              transactions={transactions}
              onEdit={openEdit}
              onDelete={(tx) => setDeleteTarget(tx)}
              onViewInvoice={(id) => setViewingInvoiceId(id)}
            />
          )}
        </div>
      </div>

      <TxFormDialog
        open={formOpen || !!editTx}
        onOpenChange={(open) => { if (!open) closeForm() }}
        categories={categories}
        onSubmit={editTx ? handleEdit : handleCreate}
        editTx={editTx}
        rates={rates}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta transacción?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <IntlPaymentWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        categories={categories}
        rates={rates}
      />

      <InvoiceQuickView
        open={!!viewingInvoiceId}
        onOpenChange={(open) => { if (!open) setViewingInvoiceId(null) }}
        invoiceId={viewingInvoiceId}
      />
    </>
  )
}
