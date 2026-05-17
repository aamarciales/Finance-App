import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Trash2, Pencil, FileText, ExternalLink } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Money } from '@/components/common/Money'
import { formatMoney } from '@/lib/format'
import type { EnrichedInvoice } from '@/hooks/useInvoices'

interface InvoiceDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: EnrichedInvoice
  onEdit: () => void
  onDelete: () => void
}

export function InvoiceDetailModal({ open, onOpenChange, invoice, onEdit, onDelete }: InvoiceDetailModalProps) {
  const dateLabel = invoice.date
    ? (() => {
        const d = parseISO(invoice.date)
        return isNaN(d.getTime()) ? '—' : format(d, "dd MMMM yyyy", { locale: es })
      })()
    : '—'

  const hasAttachment = !!invoice.attachmentUrl
  const isImage = hasAttachment && /\.(jpg|jpeg|png|webp|heic)$/i.test(invoice.attachmentUrl!)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl p-0 overflow-hidden">
        <div className="max-h-[85vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 z-10 border-b border-border bg-surface px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <DialogTitle className="font-serif text-xl">{invoice.merchant}</DialogTitle>
                {invoice.branch && (
                  <p className="text-[13px] text-text-muted">{invoice.branch}</p>
                )}
                <p className="text-[12px] text-text-muted">{dateLabel}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="outline" size="sm" className="gap-1" onClick={onEdit}>
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </Button>
                <Button variant="outline" size="sm" className="gap-1 text-danger-strong" onClick={onDelete}>
                  <Trash2 className="h-3.5 w-3.5" /> Eliminar
                </Button>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6">
            {/* Total */}
            <div className="mb-5 rounded-md bg-surface-2 px-4 py-3 text-center space-y-1">
              {invoice.discount != null && invoice.discount > 0 && (
                <>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="uppercase tracking-[0.06em] text-text-muted">Subtotal</span>
                    <span className="font-mono">{formatMoney(invoice.subtotal ?? invoice.items.reduce((s, i) => s + i.totalPrice, 0), invoice.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="uppercase tracking-[0.06em] text-text-muted">Descuento</span>
                    <span className="font-mono text-brand">−{formatMoney(invoice.discount, invoice.currency)}</span>
                  </div>
                  <div className="border-t border-border/50 my-1" />
                </>
              )}
              <Money amount={invoice.total} currency={invoice.currency} variant="kpi" />
            </div>

            {/* Main content: side-by-side */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-[1fr_260px]">
              {/* Left: items table */}
              <div>
                <h4 className="mb-2 text-[11px] uppercase tracking-[0.08em] text-text-muted">Ítems ({invoice.items.length})</h4>
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-border text-[11px] uppercase tracking-[0.06em] text-text-faint">
                      <th className="py-1.5 pr-3 font-medium">Descripción</th>
                      <th className="w-16 py-1.5 px-2 text-center font-medium">Cant.</th>
                      <th className="w-24 py-1.5 px-2 text-right font-medium hidden sm:table-cell">Precio</th>
                      <th className="w-24 py-1.5 pl-2 text-right font-medium">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item) => (
                      <tr key={item.id} className="border-b border-border/30">
                        <td className="py-1.5 pr-3">
                          {item.name}
                          {item.subCategory && (
                            <span className="ml-1 text-[11px] text-text-faint">· {item.subCategory}</span>
                          )}
                        </td>
                        <td className="py-1.5 px-2 text-center font-mono">{item.quantity}</td>
                        <td className="py-1.5 px-2 text-right font-mono hidden sm:table-cell">
                          {item.unitPrice != null ? item.unitPrice.toLocaleString('es-CO', { minimumFractionDigits: invoice.currency !== 'COP' ? 2 : 0 }) : '—'}
                        </td>
                        <td className="py-1.5 pl-2 text-right font-mono font-medium">
                          {formatMoney(item.totalPrice, invoice.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border">
                      <td colSpan={2} className="py-2 text-right text-[12px] uppercase tracking-[0.06em] text-text-muted hidden sm:table-cell">Total</td>
                      <td className="py-2 text-right text-[12px] uppercase tracking-[0.06em] text-text-muted sm:hidden" colSpan={1}>Total</td>
                      <td className="py-2 pl-2 text-right font-mono font-semibold">
                        {formatMoney(invoice.total, invoice.currency)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Right: soporte */}
              <div>
                <h4 className="mb-2 text-[11px] uppercase tracking-[0.08em] text-text-muted">Soporte</h4>
                {hasAttachment ? (
                  <div className="rounded-lg border border-border overflow-hidden bg-surface-2">
                    {isImage ? (
                      <a href={invoice.attachmentUrl} target="_blank" rel="noopener noreferrer" className="block">
                        <img
                          src={invoice.attachmentUrl}
                          alt="Soporte"
                          className="w-full object-cover max-h-[200px] hover:opacity-90 transition-opacity"
                        />
                      </a>
                    ) : (
                      <a
                        href={invoice.attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-4 text-brand hover:bg-brand/5 transition-colors"
                      >
                        <FileText className="h-8 w-8 shrink-0" />
                        <span className="text-[13px]">Ver documento PDF</span>
                      </a>
                    )}
                    <div className="flex items-center gap-2 px-3 py-2 border-t border-border">
                      <a
                        href={invoice.attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[11px] text-brand hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Abrir en nueva pestaña
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border p-4 text-center text-[13px] text-text-faint italic">
                    Sin soporte adjunto
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
