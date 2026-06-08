import { useState } from 'react'
import { Pencil, Trash2, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
import { useApi } from '@/lib/api'
import type { CategoryFormValues } from '@/lib/validators'
import type { Category } from '@/types/domain'

export default function CategoriesPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [editCategory, setEditCategory] = useState<Category | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  
  const api = useApi()
  const queryClient = useQueryClient()

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/categories'),
  })

  const expenseCategories = categories.filter((c) => c.type === 'expense')
  const incomeCategories = categories.filter((c) => c.type === 'income')

  const createMutation = useMutation({
    mutationFn: async (values: CategoryFormValues) => {
      await api.post('/categories', { ...values, isSystem: false })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Category created')
      closeForm()
    }
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number, values: CategoryFormValues }) => {
      await api.put(`/categories/${id}`, values)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Category updated')
      closeForm()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/categories/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      toast.success('Category deleted')
      setDeleteTarget(null)
    }
  })

  async function handleCreate(values: CategoryFormValues) {
    createMutation.mutate(values)
  }

  async function handleEdit(values: CategoryFormValues) {
    if (!editCategory?.id) return
    updateMutation.mutate({ id: editCategory.id, values })
  }

  async function handleDelete() {
    if (!deleteTarget?.id) return
    deleteMutation.mutate(deleteTarget.id)
  }

  function closeForm() {
    setFormOpen(false)
    setEditCategory(undefined)
  }

  return (
    <>
      <PageHeader
        title="Categories"
        subtitle="Where your money goes"
        actions={
          <Button onClick={() => setFormOpen(true)} className="gap-1.5">
            New category
          </Button>
        }
      />

      {isLoading ? (
        <div className="py-10 text-center text-text-muted">Loading…</div>
      ) : (
        <div className="space-y-8">
          <CategoryGroup
            title="Expenses"
            items={expenseCategories}
            onEdit={setEditCategory}
            onDelete={setDeleteTarget}
            onDuplicate={(c) => createMutation.mutate({ name: `${c.name} (copia)`, color: c.color, icon: c.icon, type: c.type })}
          />
          <CategoryGroup
            title="Income"
            items={incomeCategories}
            onEdit={setEditCategory}
            onDelete={setDeleteTarget}
            onDuplicate={(c) => createMutation.mutate({ name: `${c.name} (copia)`, color: c.color, icon: c.icon, type: c.type })}
          />
        </div>
      )}

      <CategoryFormDialog
        open={formOpen || !!editCategory}
        onOpenChange={(open) => { if (!open) closeForm() }}
        onSubmit={editCategory ? handleEdit : handleCreate}
        editCategory={editCategory}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Associated transactions will be reassigned to "Other". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
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
  onDuplicate,
}: {
  title: string
  items: Category[]
  onEdit: (c: Category) => void
  onDelete: (c: Category) => void
  onDuplicate: (c: Category) => void
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md transition-opacity hover:bg-surface-2 md:opacity-0 md:group-hover:opacity-100"
                    onClick={() => onDuplicate(c)}
                    aria-label="Duplicate"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Duplicate category</TooltipContent>
              </Tooltip>
              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md transition-opacity hover:bg-surface-2 md:opacity-0 md:group-hover:opacity-100"
                onClick={() => onEdit(c)}
                aria-label="Edit"
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
                  <TooltipContent>Protected system category</TooltipContent>
                </Tooltip>
              ) : (
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md transition-opacity hover:bg-surface-2 md:opacity-0 md:group-hover:opacity-100"
                  onClick={() => onDelete(c)}
                  aria-label="Delete"
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
