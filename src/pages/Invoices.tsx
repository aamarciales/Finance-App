import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { Plus, Receipt, Trash2, FileUp, Paperclip, Loader2 } from 'lucide-react'
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
import type { Invoice } from '@/types/domain'


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

  async function handleSelect(id: number) {
    const inv = invoices.find(i => i.id === id)
    if (!inv) return
    setDetailData(inv)
  }

  async function handleDelete() {
    if (!deleteTarget?.id) return
    await deleteInvoice(deleteTarget.id)
    setDeleteTarget(null)
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
        title="Facturas"
        subtitle="Compras con detalle de ítems y soportes adjuntos"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-1.5">
              <FileUp className="h-4 w-4" />
              Importar CSV
            </Button>
            <Button onClick={() => setCreateMenuOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Nueva factura
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="py-10 text-center text-text-muted">Cargando…</div>
      ) : invoices.length === 0 ? (
        <EmptyState
          title="Sin facturas registradas"
          description="Agrega facturas para ver el detalle de tus compras"
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar factura de "{deleteTarget?.merchant}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán los ítems, el attachment y la transacción asociada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImportCsvDialog open={importOpen} onOpenChange={setImportOpen} categories={categories} rates={rates} />

      <CreateMenuDialog
        open={createMenuOpen}
        onOpenChange={setCreateMenuOpen}
        onImageSelected={ocr.handleFileAccepted}
        onManual={() => setFormOpen(true)}
        label="factura"
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

function InvoiceCard({ invoice, onClick, onDelete }: { invoice: Invoice; onClick: () => void; onDelete: () => void }) {
  const dateLabel = invoice.date
    ? (() => {
        const d = parseISO(invoice.date)
        return isNaN(d.getTime()) ? '—' : format(d, 'dd MMM yyyy', { locale: es })
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
          aria-label="Eliminar"
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
        <Badge tone="gray">{invoice.itemCount} ítems</Badge>
      </div>
    </div>
  )
}
