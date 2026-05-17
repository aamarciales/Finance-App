import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Money } from '@/components/common/Money'
import { useApi } from '@/lib/api'
import { useSettings } from '@/hooks/useSettings'
import { useTRM } from '@/hooks/useTRM'
import { useForex } from '@/hooks/useForex'
import type { Currency, Transaction } from '@/types/domain'

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
  const api = useApi()
  const accounts = settings?.capitalAccounts ?? []

  const { data: transactions } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => api.get<Transaction[]>('/transactions'),
    enabled: open,
  })

  const accountRealAmounts = useMemo(() => {
    const flows = new Map<string, number>()
    if (transactions) {
      for (const tx of transactions) {
        if (!tx.accountId || tx.type === 'transfer') continue
        const flow = flows.get(tx.accountId) ?? 0
        flows.set(tx.accountId, flow + (tx.type === 'income' ? 1 : -1) * tx.amount)
      }
    }
    return flows
  }, [transactions])

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
                const flow = accountRealAmounts.get(acc.id) ?? 0
                const realAmount = acc.amount + flow
                const convertedCop =
                  acc.currency === 'COP'
                    ? realAmount
                    : acc.currency === 'USD'
                      ? realAmount * trm
                      : realAmount * eurToUsd * trm
                return (
                  <div
                    key={acc.id}
                    className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
                  >
                    <div>
                      <p className="text-[13px] font-medium">{acc.name || 'Sin nombre'}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-[11px] text-text-muted">
                          <Money amount={acc.amount} currency={acc.currency as Currency} />
                        </p>
                        {flow !== 0 && (
                          <p className="text-[11px] text-text-faint">
                            → <Money amount={realAmount} currency={acc.currency as Currency} />
                          </p>
                        )}
                      </div>
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
