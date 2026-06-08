import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface CascadeDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void> | void
  entity: 'invoice' | 'transaction'
  hasLinked: boolean
}

const LABELS = {
  invoice: { singular: 'invoice', linked: 'transaction' },
  transaction: { singular: 'transaction', linked: 'invoice' },
} as const

export function CascadeDeleteDialog({ open, onOpenChange, onConfirm, entity, hasLinked }: CascadeDeleteDialogProps) {
  const [confirmText, setConfirmText] = useState('')
  const label = LABELS[entity]

  function handleClose(open: boolean) {
    if (!open) setConfirmText('')
    onOpenChange(open)
  }

  async function handleConfirm() {
    setConfirmText('')
    await onConfirm()
  }

  // Cascade delete — require typed confirmation
  if (hasLinked) {
    return (
      <AlertDialog open={open} onOpenChange={handleClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm deletion</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-3 text-[13px] text-text-muted">
            <p>This will permanently delete:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>The {label.singular}</li>
              <li>The linked {label.linked}</li>
              <li>All invoice line items</li>
            </ul>
            <p className="font-medium text-text">This action cannot be undone.</p>
            <div className="space-y-1.5 pt-1">
              <p className="text-[12px]">Type <strong>DELETE</strong> to confirm:</p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                className="font-mono"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={confirmText !== 'DELETE'}
            >
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  }

  // Simple delete — basic confirmation
  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this {label.singular}?</AlertDialogTitle>
        </AlertDialogHeader>
        <p className="text-[13px] text-text-muted">This action cannot be undone.</p>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button variant="destructive" onClick={handleConfirm}>
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
