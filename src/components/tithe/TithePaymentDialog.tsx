import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Currency } from '@/types/domain'
import type { EnrichedTitheCommitment, RegisterPaymentData } from '@/hooks/useTitheCommitments'
import { getEquivalentAmounts } from '@/lib/currency'

interface TithePaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  commitments: EnrichedTitheCommitment[]
  trm: number
  destination: string
  onSubmit: (data: RegisterPaymentData) => Promise<void>
  isPending?: boolean
}

export function TithePaymentDialog({
  open,
  onOpenChange,
  commitments,
  trm,
  destination,
  onSubmit,
  isPending,
}: TithePaymentDialogProps) {
  const totalUsd = useMemo(
    () => commitments.reduce((s, c) => s + (c.totalAmount - c.amountPaidUsd), 0),
    [commitments],
  )
  const suggestedCop = Math.round(totalUsd * trm)

  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [currency, setCurrency] = useState<Currency>('COP')
  const [amount, setAmount] = useState('')
  const [markAsComplete, setMarkAsComplete] = useState(true)
  const [paidTo, setPaidTo] = useState(destination)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!open) return
    setDate(format(new Date(), 'yyyy-MM-dd'))
    setCurrency('COP')
    setAmount(String(suggestedCop))
    setMarkAsComplete(true)
    setPaidTo(destination)
    setNotes('')
  }, [open, suggestedCop, destination])

  const amountNum = parseFloat(amount) || 0
  const { amountInBase } = getEquivalentAmounts(amountNum, currency, { trm, eurToUsd: 1.05 })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (amountNum <= 0) return
    await onSubmit({
      date,
      commitmentIds: commitments.map((c) => c.id!),
      amount: amountNum,
      currency,
      trm,
      markAsComplete,
      destination: paidTo,
      notes: notes || undefined,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-[-0.02em]">
            Record payment
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-1">
          <p className="text-[13px] text-text-muted">
            {commitments.length} commitment{commitments.length !== 1 ? 's' : ''} ·
            calculated equivalent USD {totalUsd.toFixed(2)} (~${suggestedCop.toLocaleString('en-US')} COP)
          </p>

          <div className="grid gap-1.5">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div className="grid gap-1.5">
              <Label>Amount given</Label>
              <Input
                type="number"
                step="any"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="font-mono"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                <SelectTrigger className="w-[90px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COP">COP</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {amountNum > 0 && (
            <p className="text-[12px] text-text-muted">
              ≈ USD {amountInBase.toFixed(2)} at FX rate {trm.toLocaleString('en-US')}
            </p>
          )}

          <label className="flex cursor-pointer items-start gap-2.5 rounded-[12px] border border-border bg-surface-2/50 px-3 py-2.5">
            <Checkbox
              checked={markAsComplete}
              onCheckedChange={(v) => setMarkAsComplete(v === true)}
              className="mt-0.5"
            />
            <span className="text-[13px] leading-snug">
              I confirm I paid the full tithe for these commitments
              <span className="mt-0.5 block text-[11px] text-text-muted">
                Mark as paid even if the USD equivalent differs due to the day's FX rate.
              </span>
            </span>
          </label>

          <div className="grid gap-1.5">
            <Label>Given to</Label>
            <Input value={paidTo} onChange={(e) => setPaidTo(e.target.value)} />
          </div>

          <div className="grid gap-1.5">
            <Label>Notes (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || amountNum <= 0}>
              {isPending ? 'Saving…' : 'Record payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
