import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Money } from '@/components/common/Money'
import { formatMoney } from '@/lib/format'
import { useApi } from '@/lib/api'

import type { Invoice, InvoiceItem } from '@/types/domain'

interface InvoiceQuickViewProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoiceId: number | null
}

interface InvoiceWithItems extends Invoice {
  items: InvoiceItem[]
}

export function InvoiceQuickView({ open, onOpenChange, invoiceId }: InvoiceQuickViewProps) {
  const api = useApi()
  const [invoice, setInvoice] = useState<InvoiceWithItems | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !invoiceId) {
      setInvoice(null)
      return
    }

    let cancelled = false
    setLoading(true)

    async function load() {
      try {
        const [invoices, items] = await Promise.all([
          api.get<Invoice[]>('/invoices'),
          api.get<InvoiceItem[]>('/invoice-items'),
        ])

        if (cancelled) return

        const inv = invoices.find((i) => i.id === invoiceId)
        if (!inv) {
          setInvoice(null)
          return
        }

        const invItems = items.filter((item) => item.invoiceId === invoiceId)
        setInvoice({ ...inv, items: invItems })
      } catch {
        setInvoice(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [open, invoiceId])

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl p-0 overflow-hidden">
        <div className="max-h-[85vh] overflow-y-auto">
          {loading || !invoice ? (
            <div className="p-10 text-center text-text-muted">Cargando factura...</div>
          ) : (
            <>
              <div className="border-b border-border bg-surface px-6 py-4">
                <DialogTitle className="font-serif text-xl">{invoice.merchant}</DialogTitle>
                {invoice.branch && (
                  <p className="text-[13px] text-text-muted">{invoice.branch}</p>
                )}
                <p className="text-[12px] text-text-muted">{invoice.date} · {invoice.itemCount} ítems</p>
              </div>

              <div className="space-y-5 p-6">
                <div className="rounded-md bg-surface-2 px-4 py-3 text-center">
                  <Money amount={invoice.total} currency={invoice.currency} variant="kpi" />
                </div>

                {invoice.items.length > 0 && (
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
                          <td className="py-1.5 pr-3">{item.name}</td>
                          <td className="py-1.5 px-2 text-center font-mono">{item.quantity}</td>
                          <td className="py-1.5 px-2 text-right font-mono hidden sm:table-cell">
                            {item.unitPrice != null ? formatMoney(item.unitPrice, invoice.currency) : '—'}
                          </td>
                          <td className="py-1.5 pl-2 text-right font-mono font-medium">
                            {formatMoney(item.totalPrice, invoice.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
