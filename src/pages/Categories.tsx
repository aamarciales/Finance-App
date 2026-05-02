import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'

export default function CategoriesPage() {
  return (
    <>
      <PageHeader title="Categorías" subtitle="En qué se va tu dinero" />
      <EmptyState
        title="Sin movimientos para agrupar"
        description="Las visualizaciones llegan en Fase 3."
      />
    </>
  )
}
