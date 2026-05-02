import { PageHeader } from '@/components/layout/PageHeader'
import { useSettings } from '@/hooks/useSettings'

export default function SettingsPage() {
  const { settings, loading } = useSettings()

  return (
    <>
      <PageHeader title="Ajustes" subtitle="Configuración personal y preferencias" />
      {loading ? (
        <div className="text-text-muted">Cargando…</div>
      ) : (
        <div className="rounded-lg border border-border bg-surface p-6">
          <div className="font-serif text-[17px] font-medium">Estado actual</div>
          <pre className="mt-4 overflow-auto rounded-md bg-surface-2 p-4 font-mono text-[12px] text-text-muted">
            {JSON.stringify(settings, null, 2)}
          </pre>
          <p className="mt-4 text-[12.5px] text-text-muted">
            Editor visual de settings llega en Fase 8.
          </p>
        </div>
      )}
    </>
  )
}
