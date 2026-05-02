import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'

export default function GoalsPage() {
  return (
    <>
      <PageHeader
        title="Metas de ahorro"
        subtitle="Objetivos que te acercan a tu próximo paso"
      />
      <EmptyState title="Sin metas definidas" description="Llegan en Fase 5." />
    </>
  )
}
