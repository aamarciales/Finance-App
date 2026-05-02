import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'

export default function ImportPage() {
  return (
    <>
      <PageHeader
        title="Importar"
        subtitle="Sube fotos de facturas, archivos CSV o PDFs"
      />
      <EmptyState
        title="Importación en construcción"
        description="OCR + parsers CSV se conectan en Fase 6."
      />
    </>
  )
}
