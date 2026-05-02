import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'

export default function DebtsPage() {
  return (
    <>
      <PageHeader title="Deudas" subtitle="Saldos, intereses y cronograma de pagos" />
      <EmptyState title="Sin deudas activas" description="Llegan en Fase 5." />
    </>
  )
}
