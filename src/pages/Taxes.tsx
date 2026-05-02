import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'

export default function TaxesPage() {
  return (
    <>
      <PageHeader
        title={
          <>
            Impuestos · <em className="font-serif italic">Colombia</em>
          </>
        }
        subtitle="Seguimiento de obligaciones tributarias DIAN"
      />
      <EmptyState
        title="Configura tu perfil tributario"
        description="Sección DIAN completa llega en Fase 7."
      />
    </>
  )
}
