import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { useSettings } from '@/hooks/useSettings'

export default function DashboardPage() {
  const { settings } = useSettings()
  const now = new Date()
  const hour = now.getHours()
  const greeting =
    hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'
  const monthLabel = format(now, "LLLL yyyy", { locale: es })
  const month = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)
  const name = settings?.displayName ?? 'tú'

  return (
    <>
      <PageHeader
        title={
          <>
            {greeting}, <em className="not-italic font-serif italic text-brand">{name}</em>.
          </>
        }
        subtitle={`${month} · Resumen del mes en curso`}
      />
      <EmptyState
        title="Aún no hay datos"
        description="En la Fase 2 conectaremos transacciones reales y los KPIs cobrarán vida."
      />
    </>
  )
}
