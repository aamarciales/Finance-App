import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'

export default function TithePage() {
  return (
    <>
      <PageHeader
        title={
          <>
            <em className="font-serif italic">Diezmo</em> & Ofrendas
          </>
        }
        subtitle="“Porque el Señor tu Dios es quien te da el poder para hacer las riquezas” · Dt 8:18"
      />
      <EmptyState
        title="Sin ingresos registrados"
        description="Cálculo automático de diezmos y ofrendas llega en Fase 5."
      />
    </>
  )
}
