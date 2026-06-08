import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { displayLocale } from '../lib/locale'
import { toast } from 'sonner'
import { Plus, Receipt, Trash2, FileUp, Paperclip, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { Money } from '@/components/common/Money'
import { Badge } from '@/components/common/Badge'
import { CascadeDeleteDialog } from '@/components/common/CascadeDeleteDialog'
import { Button } from '@/components/ui/button'
import { InvoiceFormDialog } from '@/components/invoices/InvoiceFormDialog'
import { InvoiceDetailModal } from '@/components/invoices/InvoiceDetailModal'
import { ImportCsvDialog } from '@/components/invoices/ImportCsvDialog'
import { OcrPreviewDialog } from '@/components/import/OcrPreviewDialog'
import { CreateMenuDialog } from '@/components/common/CreateMenuDialog'
import { useInvoices, type EnrichedInvoice } from '@/hooks/useInvoices'
import { useTransactions } from '@/hooks/useTransactions'
import { useOcrFlow } from '@/hooks/useOcrFlow'
import { useTRM } from '@/hooks/useTRM'
import { useForex } from '@/hooks/useForex'
import { resolveInternalType } from '@/lib/validators'
import { useApi } from '@/lib/api'
import type { Invoice, AppSettings, CapitalAccount } from '@/types/domain'


export default function InvoicesPage() {
  const { rate: trm } = useTRM()
  const { eurToUsd } = useForex()
  const rates = { trm, eurToUsd }
  const { invoices, categories, loading, addInvoice, updateInvoice, deleteInvoice } = useInvoices(rates)
  const { addTransaction } = useTransactions({ tab: 'all' }, rates)
  const ocr = useOcrFlow()
  const [formOpen, setFormOpen] = useState(false)
  const [editInvoice, setEditInvoice] = useState<EnrichedInvoice | null>(null)
  const [detailData, setDetailData] = useState<EnrichedInvoice | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [createMenuOpen, setCreateMenuOpen] = useState(false)
  const api = useApi()

  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const rows = await api.get<{ key: string; value: unknown }[]>('/settings')
      const map: Record<string, unknown> = {}
      for (const r of rows) map[r.key] = r.value
      return map as Partial<AppSettings>
    },
  })
  const capitalAccounts: CapitalAccount[] = (settingsData?.capitalAccounts as CapitalAccount[] | undefined) ?? []

  async function handleSelect(id: number) {
    const inv = invoices.find(i => i.id === id)
    if (!inv) return
    setDetailData(inv)
  }

  async function handleDelete() {
    if (!deleteTarget?.id) return
    try {
      await deleteInvoice(deleteTarget.id)
      setDeleteTarget(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not delete invoice')
    }
  }

  function handleEdit() {
    if (!detailData) return
    setEditInvoice(detailData)
    setDetailData(null)
  }

  // Auto-process OCR when file is selected
  useEffect(() => {
    console.log('[InvPage] OCR useEffect fired', {
      imageFile: ocr.imageFile ? `${ocr.imageFile.name} (${ocr.imageFile.size}b)` : null,
      processing: ocr.processing,
      ocrResult: !!ocr.ocrResult,
    })
    if (ocr.imageFile && !ocr.ocrResult && !ocr.processing) {
      console.log('[InvPage] Triggering processOCR...')
      ocr.processOCR()
    }
  }, [ocr.imageFile])

  async function handleOcrInvoice(data: Parameters<typeof addInvoice>[0]) {
    await addInvoice(data)
    ocr.reset()
  }

  async function handleOcrTransaction(data: { concept: string; date: string; amount: number; currency: 'COP' | 'USD' | 'EUR'; categoryId: number; attachments?: string[]; accountId?: string | null; actualAmount?: number | null }) {
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
      accountId: data.accountId ?? undefined,
      actualAmount: data.actualAmount,
    })
    toast.success('Transaction created')
    ocr.reset()
  }

  return (
    <>
      <PageHeader
        title="Invoices"
        subtitle="Purchases with line items and attachments"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-1.5">
              <FileUp className="h-4 w-4" />
              Import CSV
            </Button>
            <Button onClick={() => setCreateMenuOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              New invoice
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="py-10 text-center text-text-muted">Loading…</div>
      ) : invoices.length === 0 ? (
        <EmptyState
          title="No invoices yet"
          description="Add invoices to see purchase details"
          icon={<Receipt className="h-8 w-8 text-text-faint" />}
        />
      ) : (
        <div className="overflow-x-hidden">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {invoices.map((inv) => (
              <InvoiceCard key={inv.id} invoice={inv} onClick={() => handleSelect(inv.id!)} onDelete={() => setDeleteTarget(inv)} />
            ))}
          </div>
        </div>
      )}

      <InvoiceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        categories={categories}
        onSubmit={addInvoice}
      />

      <InvoiceFormDialog
        open={!!editInvoice}
        onOpenChange={(open) => { if (!open) setEditInvoice(null) }}
        categories={categories}
        onSubmit={async (data) => {
          if (!editInvoice?.id) return
          await updateInvoice(editInvoice.id, data, editInvoice)
          setEditInvoice(null)
        }}
        editInvoice={editInvoice ?? undefined}
      />

      {detailData && (
        <InvoiceDetailModal
          open={!!detailData}
          onOpenChange={(open) => { if (!open) setDetailData(null) }}
          invoice={detailData}
          onEdit={handleEdit}
          onDelete={() => { setDeleteTarget(detailData); setDetailData(null) }}
        />
      )}

      <CascadeDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        entity="invoice"
        hasLinked={!!deleteTarget?.transactionId}
      />

      <ImportCsvDialog open={importOpen} onOpenChange={setImportOpen} categories={categories} rates={rates} />

      <CreateMenuDialog
        open={createMenuOpen}
        onOpenChange={setCreateMenuOpen}
        onImageSelected={ocr.handleFileAccepted}
        onManual={() => setFormOpen(true)}
        label="invoice"
      />

      {ocr.processing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="flex flex-col items-center gap-3 rounded-xl bg-surface px-8 py-6 shadow-lg">
            <Loader2 className="h-8 w-8 animate-spin text-brand" />
            <p className="text-[14px] font-medium">Processing OCR…</p>
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
          capitalAccounts={capitalAccounts}
          officialTrm={trm}
          onSaveInvoice={handleOcrInvoice}
          onSaveTransaction={handleOcrTransaction}
        />
      )}
    </>
  )
}

function InvoiceCard({ invoice, onClick, onDelete }: { invoice: Invoice; onClick: () => void; onDelete: () => void }) {
  const dateLabel = invoice.date
    ? (() => {
        const d = parseISO(invoice.date)
        return isNaN(d.getTime()) ? '—' : format(d, 'dd MMM yyyy', { locale: displayLocale })
      })()
    : '—'

  return (
    <div
      className="group cursor-pointer rounded-[10px] border border-border bg-surface p-5 transition-colors hover:bg-surface-2/40"
      onClick={onClick}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-[14px] font-medium truncate">{invoice.merchant}</div>
          {invoice.branch && (
            <div className="text-[12px] text-text-muted">{invoice.branch}</div>
          )}
        </div>
        <button
          type="button"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md opacity-0 transition-opacity hover:bg-surface-2 group-hover:opacity-100"
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          aria-label="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mb-2 font-mono text-[13px] text-text-muted">{dateLabel}</div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Money amount={invoice.total} currency={invoice.currency} variant="inline" className="font-semibold" />
          {invoice.attachmentUrl && (
            <Paperclip className="h-3.5 w-3.5 text-text-muted" />
          )}
        </div>
        <Badge tone="gray">{invoice.itemCount} items</Badge>
      </div>
    </div>
  )
}
