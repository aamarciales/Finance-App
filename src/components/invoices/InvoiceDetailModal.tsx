import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Trash2, Pencil } from 'lucide-react'
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

  return (
    <>
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
            <div className="space-y-5 p-6">
              {/* Total */}
              <div className="rounded-md bg-surface-2 px-4 py-3 text-center">
                <Money amount={invoice.total} currency={invoice.currency} variant="kpi" />
              </div>

              {/* Content: items + attachment */}
              <div className="space-y-5">
                {/* Items table — full width */}
                <div>
                  <h4 className="mb-2 text-[11px] uppercase tracking-[0.08em] text-text-muted">Ítems ({invoice.items.length})</h4>
                  <table className="w-full text-left text-[13px]">
                    <thead>
                      <tr className="border-b border-border text-[11px] uppercase tracking-[0.06em] text-text-faint">
                        <th className="py-1.5 pr-3 font-medium">Descripción</th>
                        <th className="w-20 py-1.5 px-2 text-center font-medium">Cant.</th>
                        <th className="w-24 py-1.5 px-2 text-right font-medium hidden sm:table-cell">Precio</th>
                        <th className="w-28 py-1.5 pl-2 text-right font-medium">Subtotal</th>
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
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
