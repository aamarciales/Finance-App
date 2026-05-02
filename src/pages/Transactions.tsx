import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'

export default function TransactionsPage() {
  return (
    <>
      <PageHeader
        title="Transacciones"
        subtitle="Todas las entradas y salidas registradas"
      />
      <EmptyState title="Sin transacciones todavía" description="Llegan en Fase 2." />
    </>
  )
}
