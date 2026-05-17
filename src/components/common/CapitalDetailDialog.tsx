import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Money } from '@/components/common/Money'
import { useSettings } from '@/hooks/useSettings'
import { useTRM } from '@/hooks/useTRM'
import { useForex } from '@/hooks/useForex'
import type { Currency } from '@/types/domain'

interface CapitalDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  totalCop: number
  totalUsd: number
}

export function CapitalDetailDialog({ open, onOpenChange, totalCop, totalUsd }: CapitalDetailDialogProps) {
  const { settings } = useSettings()
  const { rate: trm } = useTRM()
  const { eurToUsd } = useForex()
  const accounts = settings?.capitalAccounts ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogTitle>Capital disponible — Detalle</DialogTitle>
        <div className="space-y-3 pt-2">
          {accounts.length === 0 ? (
            <p className="text-[13px] text-text-muted py-4 text-center">
              No hay cuentas configuradas. Ve a Ajustes para agregarlas.
            </p>
          ) : (
            <>
              {accounts.map((acc) => {
                const convertedCop =
                  acc.currency === 'COP'
                    ? acc.amount
                    : acc.currency === 'USD'
                      ? acc.amount * trm
                      : acc.amount * eurToUsd * trm
                return (
                  <div
                    key={acc.id}
                    className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
                  >
                    <div>
                      <p className="text-[13px] font-medium">{acc.name || 'Sin nombre'}</p>
                      <p className="text-[11px] text-text-muted">
                        <Money amount={acc.amount} currency={acc.currency as Currency} />
                      </p>
                    </div>
                    <p className="text-[12px] text-text-muted font-mono">
                      ≈ {formatCop(convertedCop)}
                    </p>
                  </div>
                )
              })}
              <div className="border-t border-border pt-3 flex items-center justify-between">
                <span className="text-[13px] font-medium">Total</span>
                <div className="text-right">
                  <p className="text-[14px] font-semibold">{formatCop(totalCop)}</p>
                  {totalUsd > 0 && (
                    <p className="text-[11px] text-text-muted">
                      ≈ USD {totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function formatCop(amount: number): string {
  return `COP $${Math.round(amount).toLocaleString('es-CO')}`
}
