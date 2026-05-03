import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLiveQuery } from 'dexie-react-hooks'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/common/Badge'
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { CategoryFormDialog } from '@/components/categories/CategoryFormDialog'
import { db } from '@/db/schema'
import { logChange } from '@/hooks/useAuditLog'
import type { CategoryFormValues } from '@/lib/validators'
import type { Category } from '@/types/domain'

export default function CategoriesPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [editCategory, setEditCategory] = useState<Category | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const categories = useLiveQuery(() => db.categories.toArray()) ?? []

  const expenseCategories = categories.filter((c) => c.type === 'expense')
  const incomeCategories = categories.filter((c) => c.type === 'income')

  async function handleCreate(values: CategoryFormValues) {
    const id = await db.categories.add({
      ...values,
      isSystem: false,
    }) as number
    await logChange({
      entityType: 'category',
      entityId: id,
      operation: 'create',
      afterState: { ...values, isSystem: false },
      description: `Nueva categoría: ${values.name}`,
    })
  }

  async function handleEdit(values: CategoryFormValues) {
    if (!editCategory?.id) return
    const beforeState = { ...editCategory }
    await db.categories.update(editCategory.id, values)
    await logChange({
      entityType: 'category',
      entityId: editCategory.id,
      operation: 'update',
      beforeState,
      afterState: values,
      description: `Editada categoría: ${values.name}`,
    })
    toast.success('Categoría actualizada')
    setEditCategory(undefined)
  }

  async function handleDelete() {
    if (!deleteTarget?.id) return
    const beforeState = { ...deleteTarget }
    const otros = categories.find((c) => c.name === 'Otros' && c.type === 'expense')
    if (otros) {
      await db.transactions
        .where('categoryId')
        .equals(deleteTarget.id)
        .modify({ categoryId: otros.id! })
    }
    await logChange({
      entityType: 'category',
      entityId: deleteTarget.id,
      operation: 'delete',
      beforeState,
      description: `Eliminada categoría: ${deleteTarget.name}`,
    })
    await db.categories.delete(deleteTarget.id)
    toast.success('Categoría eliminada')
    setDeleteTarget(null)
  }

  function closeForm() {
    setFormOpen(false)
    setEditCategory(undefined)
  }

  return (
    <>
      <PageHeader
        title="Categorías"
        subtitle="En qué se va tu dinero"
        actions={
          <Button onClick={() => setFormOpen(true)} className="gap-1.5">
            Nueva categoría
          </Button>
        }
      />

      <div className="space-y-8">
        <CategoryGroup
          title="Gastos"
          items={expenseCategories}
          onEdit={setEditCategory}
          onDelete={setDeleteTarget}
        />
        <CategoryGroup
          title="Ingresos"
          items={incomeCategories}
          onEdit={setEditCategory}
          onDelete={setDeleteTarget}
        />
      </div>

      <CategoryFormDialog
        open={formOpen || !!editCategory}
        onOpenChange={(open) => { if (!open) closeForm() }}
        onSubmit={editCategory ? handleEdit : handleCreate}
        editCategory={editCategory}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Las transacciones asociadas se reasignarán a "Otros". Esta acción no se puede deshacer.
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

function CategoryGroup({
  title,
  items,
  onEdit,
  onDelete,
}: {
  title: string
  items: Category[]
  onEdit: (c: Category) => void
  onDelete: (c: Category) => void
}) {
  return (
    <div>
      <h3 className="mb-3 text-[11px] uppercase tracking-[0.1em] text-text-faint">
        {title}
      </h3>
      <div className="space-y-1">
        {items.map((c) => (
          <div
            key={c.id}
            className="group grid items-center rounded-md px-3 py-2 hover:bg-surface-2"
            style={{ gridTemplateColumns: '28px 1fr 90px 70px', gap: '12px' }}
          >
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: c.color }}
            />
            <span className="text-[13.5px] truncate">{c.name}</span>
            <span>
              {c.isSystem && (
                <Badge tone="gray">Sistema</Badge>
              )}
            </span>
            <span className="inline-flex items-center gap-1">
              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md transition-opacity hover:bg-surface-2 md:opacity-0 md:group-hover:opacity-100"
                onClick={() => onEdit(c)}
                aria-label="Editar"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              {c.isSystem ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-faint opacity-0 group-hover:opacity-100 cursor-not-allowed">
                      <Trash2 className="h-3.5 w-3.5" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Categoría protegida del sistema</TooltipContent>
                </Tooltip>
              ) : (
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md transition-opacity hover:bg-surface-2 md:opacity-0 md:group-hover:opacity-100"
                  onClick={() => onDelete(c)}
                  aria-label="Eliminar"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
