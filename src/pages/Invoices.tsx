import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'

export default function InvoicesPage() {
  return (
    <>
      <PageHeader
        title="Facturas"
        subtitle="Compras con detalle de ítems y soportes adjuntos"
      />
      <EmptyState
        title="Sin facturas registradas"
        description="Drill-down de ítems llega en Fase 4."
      />
    </>
  )
}
