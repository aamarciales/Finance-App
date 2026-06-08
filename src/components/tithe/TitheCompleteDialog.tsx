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
import type { EnrichedTitheCommitment } from '@/hooks/useTitheCommitments'

interface TitheCompleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  commitment: EnrichedTitheCommitment | null
  isPending?: boolean
  onConfirm: () => Promise<void>
}

/** Confirm full payment when USD equivalent differs (e.g. COP paid at a different TRM). */
export function TitheCompleteDialog({
  open,
  onOpenChange,
  commitment,
  isPending,
  onConfirm,
}: TitheCompleteDialogProps) {
  if (!commitment) return null

  const remaining = Math.max(0, commitment.totalAmount - commitment.amountPaidUsd)

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mark as paid</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-[13px] text-text-muted">
              <p>
                <span className="font-medium text-text">{commitment.incomeConcept || 'Commitment'}</span>
                {' · '}USD {commitment.totalAmount.toFixed(2)} total
              </p>
              <p>
                Recorded: USD {commitment.amountPaidUsd.toFixed(2)}
                {remaining > 0 && (
                  <> · FX difference: USD {remaining.toFixed(2)}</>
                )}
              </p>
              <p>
                Confirm that you already gave the full tithe even if the USD equivalent does not match
                exactly at the payment day's exchange rate.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={async (e) => {
              e.preventDefault()
              await onConfirm()
              onOpenChange(false)
            }}
          >
            {isPending ? 'Saving…' : 'Confirm full payment'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
