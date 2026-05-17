import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Globe, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { TxTabs } from '@/components/transactions/TxTabs'
import { TxFilters, periodToDates } from '@/components/transactions/TxFilters'
import { TransactionsTable } from '@/components/transactions/TransactionsTable'
import { TxFormDialog } from '@/components/transactions/TxFormDialog'
import { IntlPaymentWizard } from '@/components/transactions/IntlPaymentWizard'
import { InvoiceQuickView } from '@/components/invoices/InvoiceQuickView'
import { OcrPreviewDialog } from '@/components/import/OcrPreviewDialog'
import { CreateMenuDialog } from '@/components/common/CreateMenuDialog'
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
import { useInvoices } from '@/hooks/useInvoices'
import { useOcrFlow } from '@/hooks/useOcrFlow'
import { useTRM } from '@/hooks/useTRM'
import { useForex } from '@/hooks/useForex'

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
  const [duplicateTx, setDuplicateTx] = useState<Transaction | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<EnrichedTransaction | null>(null)
  const [viewingInvoiceId, setViewingInvoiceId] = useState<number | null>(null)
  const [createMenuOpen, setCreateMenuOpen] = useState(false)
  const ocr = useOcrFlow()

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
  const { addInvoice } = useInvoices(rates)

  const handleCreate = useCallback(
    async (values: TxFormValues) => {
      const cat = categories.find((c) => c.id === values.categoryId)
      const internalType = resolveInternalType(cat?.name ?? '', values.type)
      await addTransaction({
        date: values.date,
        type: internalType,
        concept: values.concept,
        categoryId: values.categoryId,
        amount: values.amount,
        currency: values.currency,
        trm: values.trm,
        notes: values.notes ?? undefined,
        isRecurring: values.isRecurring ?? undefined,
        debtId: values.debtId ?? undefined,
        capitalAmount: values.capitalAmount ?? undefined,
        interestAmount: values.interestAmount ?? undefined,
        attachments: values.attachments ?? undefined,
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
      await updateTransaction(editTx.id, {
        date: values.date,
        type: internalType,
        concept: values.concept,
        categoryId: values.categoryId,
        amount: values.amount,
        currency: values.currency,
        trm: values.trm,
        notes: values.notes ?? undefined,
        isRecurring: values.isRecurring ?? undefined,
        debtId: values.debtId ?? undefined,
        capitalAmount: values.capitalAmount ?? undefined,
        interestAmount: values.interestAmount ?? undefined,
      })
      toast.success('Transacción actualizada')
      setEditTx(undefined)
    },
    [editTx, updateTransaction, categories],
  )

  const handleDelete = useCallback(async () => {
    if (!deleteTarget?.id) return
    try {
      await deleteTransaction(deleteTarget.id)
      toast.success('Transacción eliminada')
      setDeleteTarget(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al eliminar la transacción')
    }
  }, [deleteTarget, deleteTransaction])

  function openEdit(tx: EnrichedTransaction) {
    setEditTx(tx)
  }

  function closeForm() {
    setFormOpen(false)
    setEditTx(undefined)
    setDuplicateTx(undefined)
  }

  // Auto-process OCR when file is selected
  useEffect(() => {
    console.log('[TxPage] OCR useEffect fired', {
      imageFile: ocr.imageFile ? `${ocr.imageFile.name} (${ocr.imageFile.size}b)` : null,
      processing: ocr.processing,
      ocrResult: !!ocr.ocrResult,
    })
    if (ocr.imageFile && !ocr.ocrResult && !ocr.processing) {
      console.log('[TxPage] Triggering processOCR...')
      ocr.processOCR()
    }
  }, [ocr.imageFile])

  async function handleOcrInvoice(data: Parameters<typeof addInvoice>[0]) {
    await addInvoice(data)
    ocr.reset()
  }

  async function handleOcrTransaction(data: { concept: string; date: string; amount: number; currency: 'COP' | 'USD' | 'EUR'; categoryId: number; attachments?: string[] }) {
    const cat = categories.find(c => c.id === data.categoryId)
    const internalType = resolveInternalType(cat?.name ?? '', 'expense')
    await addTransaction({
      date: data.date,
      type: internalType,
      concept: data.concept,
      categoryId: data.categoryId,
      amount: data.amount,
      currency: data.currency,
      trm: rates.trm,
      attachments: data.attachments,
    })
    toast.success('Transacción creada')
    ocr.reset()
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
            <Button onClick={() => setCreateMenuOpen(true)} className="gap-1.5">
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
              onDuplicate={(tx) => { setDuplicateTx(tx); setFormOpen(true) }}
              onViewInvoice={(id) => setViewingInvoiceId(id)}
            />
          )}
        </div>
      </div>

      <TxFormDialog
        open={formOpen || !!editTx || !!duplicateTx}
        onOpenChange={(open) => { if (!open) closeForm() }}
        categories={categories}
        onSubmit={editTx ? handleEdit : handleCreate}
        editTx={editTx}
        prefillTx={duplicateTx}
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

      <CreateMenuDialog
        open={createMenuOpen}
        onOpenChange={setCreateMenuOpen}
        onImageSelected={ocr.handleFileAccepted}
        onManual={() => setFormOpen(true)}
        label="transacción"
      />

      {ocr.processing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="flex flex-col items-center gap-3 rounded-xl bg-surface px-8 py-6 shadow-lg">
            <Loader2 className="h-8 w-8 animate-spin text-brand" />
            <p className="text-[14px] font-medium">Procesando OCR…</p>
          </div>
        </div>
      )}

      {ocr.ocrResult && ocr.imageFile && (
        <OcrPreviewDialog
          open={!!ocr.ocrResult}
          onOpenChange={(open) => { if (!open) ocr.reset() }}
          result={ocr.ocrResult}
          imageBlob={ocr.imageFile}
          categories={categories}
          onSaveInvoice={handleOcrInvoice}
          onSaveTransaction={handleOcrTransaction}
        />
      )}
    </>
  )
}
