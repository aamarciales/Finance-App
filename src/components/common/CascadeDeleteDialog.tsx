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
  invoice: { singular: 'factura', linked: 'transacción' },
  transaction: { singular: 'transacción', linked: 'factura' },
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
            <AlertDialogTitle>Confirmar eliminación</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-3 text-[13px] text-text-muted">
            <p>Esto eliminará permanentemente:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>La {label.singular}</li>
              <li>La {label.linked} asociada</li>
              <li>Todos los ítems de la factura</li>
            </ul>
            <p className="font-medium text-text">Esta acción no se puede deshacer.</p>
            <div className="space-y-1.5 pt-1">
              <p className="text-[12px]">Escribe <strong>BORRAR</strong> para confirmar:</p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="BORRAR"
                className="font-mono"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={confirmText !== 'BORRAR'}
            >
              Eliminar
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
          <AlertDialogTitle>¿Eliminar esta {label.singular}?</AlertDialogTitle>
        </AlertDialogHeader>
        <p className="text-[13px] text-text-muted">Esta acción no se puede deshacer.</p>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button variant="destructive" onClick={handleConfirm}>
            Eliminar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
