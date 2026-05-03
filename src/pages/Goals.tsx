import { useState, useMemo } from 'react'
import { format, parseISO, differenceInMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus, Trash2, Pencil, Wallet, Target } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { Money } from '@/components/common/Money'
import { Button } from '@/components/ui/button'
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
import { GoalFormDialog } from '@/components/goals/GoalFormDialog'
import { GoalContributeDialog } from '@/components/goals/GoalContributeDialog'
import { useGoals, type GoalFormData } from '@/hooks/useGoals'
import type { Goal } from '@/types/domain'

export default function GoalsPage() {
  const { goals, loading, addGoal, updateGoal, deleteGoal, contributeToGoal } = useGoals()
  const [formOpen, setFormOpen] = useState(false)
  const [editGoal, setEditGoal] = useState<Goal | null>(null)
  const [contributeGoal, setContributeGoal] = useState<Goal | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Goal | null>(null)

  async function handleCreate(data: GoalFormData) {
    await addGoal(data)
  }

  async function handleEdit(data: GoalFormData) {
    if (!editGoal?.id) return
    await updateGoal(editGoal.id, data)
    setEditGoal(null)
  }

  async function handleDelete() {
    if (!deleteTarget?.id) return
    await deleteGoal(deleteTarget.id)
    setDeleteTarget(null)
  }

  async function handleContribute(goalId: number, amount: number) {
    await contributeToGoal(goalId, amount)
    setContributeGoal(null)
  }

  return (
    <>
      <PageHeader
        title="Metas de ahorro"
        subtitle="Objetivos que te acercan a tu próximo paso"
        actions={
          <Button onClick={() => setFormOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Nueva meta
          </Button>
        }
      />

      {loading ? (
        <div className="py-10 text-center text-text-muted">Cargando…</div>
      ) : goals.length === 0 ? (
        <EmptyState
          title="Sin metas definidas"
          description="Crea metas de ahorro para visualizar tu progreso"
          icon={<Target className="h-8 w-8 text-text-faint" />}
          action={
            <Button onClick={() => setFormOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Crear meta
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={() => setEditGoal(goal)}
              onDelete={() => setDeleteTarget(goal)}
              onContribute={() => setContributeGoal(goal)}
            />
          ))}
        </div>
      )}

      {/* Create */}
      <GoalFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
      />

      {/* Edit */}
      <GoalFormDialog
        open={!!editGoal}
        onOpenChange={(open) => { if (!open) setEditGoal(null) }}
        onSubmit={handleEdit}
        editGoal={editGoal ?? undefined}
      />

      {/* Contribute */}
      {contributeGoal && (
        <GoalContributeDialog
          open={!!contributeGoal}
          onOpenChange={(open) => { if (!open) setContributeGoal(null) }}
          goal={contributeGoal}
          onContribute={handleContribute}
        />
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar meta "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la meta y todo su historial de aportes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function GoalCard({ goal, onEdit, onDelete, onContribute }: {
  goal: Goal
  onEdit: () => void
  onDelete: () => void
  onContribute: () => void
}) {
  const progress = goal.targetAmount > 0 ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) : 0
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount)

  const suggestion = useMemo(() => {
    if (remaining <= 0 || !goal.targetDate) return null
    const d = parseISO(goal.targetDate)
    if (isNaN(d.getTime())) return null
    const months = differenceInMonths(d, new Date())
    if (months <= 0) return null
    return Math.ceil(remaining / months)
  }, [remaining, goal.targetDate])

  let targetLabel = ''
  if (goal.targetDate) {
    const d = parseISO(goal.targetDate)
    if (!isNaN(d.getTime())) targetLabel = format(d, 'MMM yyyy', { locale: es })
  }

  return (
    <div
      className="group rounded-[10px] border border-border bg-surface p-5 transition-colors hover:bg-surface-2/40"
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white text-[14px]"
            style={{ backgroundColor: goal.color }}
          >
            <Target className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[14px] font-medium truncate">{goal.name}</div>
            {goal.description && (
              <div className="text-[12px] text-text-muted truncate">{goal.description}</div>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-surface-2"
            onClick={onEdit}
            aria-label="Editar"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-surface-2 text-danger-strong"
            onClick={onDelete}
            aria-label="Eliminar"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="h-2 rounded-full bg-surface-2">
          <div
            className="h-2 rounded-full transition-all"
            style={{ width: `${progress}%`, backgroundColor: goal.color }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[12px]">
          <span className="text-text-muted">{progress.toFixed(0)}%</span>
          {targetLabel && <span className="text-text-muted">{targetLabel}</span>}
        </div>
      </div>

      {/* Amounts */}
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <div className="font-mono text-[15px] font-medium">
            <Money amount={goal.currentAmount} currency={goal.currency} variant="inline" />
          </div>
          <div className="text-[11px] text-text-muted">
            de <Money amount={goal.targetAmount} currency={goal.currency} variant="inline" />
          </div>
        </div>
        {suggestion != null && goal.monthlyContribution == null && (
          <div className="text-right text-[11px] text-text-muted">
            Ahorra <span className="font-mono font-medium text-text">
              {goal.currency} {suggestion.toLocaleString('es-CO', { minimumFractionDigits: goal.currency !== 'COP' ? 2 : 0 })}
            </span>/mes
          </div>
        )}
      </div>

      {/* Actions */}
      {remaining > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5 text-[12px]"
          onClick={onContribute}
        >
          <Wallet className="h-3.5 w-3.5" /> Abonar
        </Button>
      )}
    </div>
  )
}
