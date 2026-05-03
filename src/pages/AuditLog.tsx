import { useState } from 'react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Pencil, Trash2, Plus, Undo2, RotateCw } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { Badge } from '@/components/common/Badge'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  useAuditLogEntries,
  revertEntry,
} from '@/hooks/useAuditLog'
import type { AuditLogEntry, AuditEntityType, AuditOperation } from '@/types/domain'

const OP_ICONS = {
  create: Plus,
  update: Pencil,
  delete: Trash2,
  revert: Undo2,
}

const ENTITY_LABELS: Record<string, string> = {
  transaction: 'Transacción',
  category: 'Categoría',
  debt: 'Deuda',
  goal: 'Meta',
  tithe_payment: 'Diezmo',
}

export default function AuditLogPage() {
  const [entityFilter, setEntityFilter] = useState<string>('all')
  const [opFilter, setOpFilter] = useState<string>('all')
  const [period, setPeriod] = useState<string>('month')
  const [revertTarget, setRevertTarget] = useState<AuditLogEntry | null>(null)

  const entries = useAuditLogEntries({
    entityType: entityFilter !== 'all' ? entityFilter as AuditEntityType : undefined,
    operation: opFilter !== 'all' ? opFilter as AuditOperation : undefined,
    period: period as 'today' | 'week' | 'month' | 'all',
  })

  async function handleRevert() {
    if (!revertTarget) return
    try {
      await revertEntry(revertTarget)
      toast.success('Cambio revertido')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo revertir')
    }
    setRevertTarget(null)
  }

  return (
    <>
      <PageHeader
        title="Historial de cambios"
        subtitle="Últimos 100 movimientos · solo el último cambio de cada entidad puede revertirse"
      />

      <div className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las entidades</SelectItem>
              <SelectItem value="transaction">Transacciones</SelectItem>
              <SelectItem value="category">Categorías</SelectItem>
              <SelectItem value="debt">Deudas</SelectItem>
              <SelectItem value="goal">Metas</SelectItem>
            </SelectContent>
          </Select>

          <Select value={opFilter} onValueChange={setOpFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las ops</SelectItem>
              <SelectItem value="create">Creaciones</SelectItem>
              <SelectItem value="update">Ediciones</SelectItem>
              <SelectItem value="delete">Eliminaciones</SelectItem>
            </SelectContent>
          </Select>

          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="week">Esta semana</SelectItem>
              <SelectItem value="month">Este mes</SelectItem>
              <SelectItem value="all">Todo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border border-border bg-surface">
          {!entries ? (
            <div className="py-10 text-center text-text-muted">Cargando…</div>
          ) : entries.length === 0 ? (
            <EmptyState
              title="Sin registros"
              description="No hay cambios en el historial para los filtros seleccionados"
            />
          ) : (
            <div className="divide-y divide-border/50">
              {entries.slice(0, 100).map((entry) => (
                <AuditRow
                  key={entry.id}
                  entry={entry}
                  onRevert={setRevertTarget}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={!!revertTarget} onOpenChange={(open) => !open && setRevertTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Revertir este cambio?</AlertDialogTitle>
            <AlertDialogDescription>
              La entidad volverá al estado anterior. La reversión quedará registrada en el historial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevert}>Revertir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function AuditRow({ entry, onRevert }: { entry: AuditLogEntry; onRevert: (e: AuditLogEntry) => void }) {
  const OpIcon = OP_ICONS[entry.operation] ?? RotateCw
  const timeAgo = formatDistanceToNow(parseISO(entry.timestamp), { addSuffix: true, locale: es })

  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <OpIcon className="mt-0.5 h-4 w-4 shrink-0 text-text-faint" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px]">{entry.description}</p>
        <p className="text-[11px] text-text-faint">
          {timeAgo} · {ENTITY_LABELS[entry.entityType] ?? entry.entityType}
        </p>
      </div>
      {entry.isReverted ? (
        <Badge tone="gray">Revertido</Badge>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 text-[12px]"
              onClick={() => onRevert(entry)}
            >
              <Undo2 className="mr-1 h-3.5 w-3.5" />
              Revertir
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {entry.operation === 'create'
              ? 'Solo se puede revertir si es el último cambio'
              : 'Revertir al estado anterior'}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}
