import { useCallback, useEffect, useState } from 'react'
import { db } from '@/db/schema'
import type { AppSettings } from '@/types/domain'

/**
 * Lee TODAS las settings desde Dexie y las devuelve como AppSettings tipado.
 * Reactivo: si se actualiza una setting con `setSetting`, re-fetchea.
 *
 * Uso preliminar (Fase 1) — en Fase 2 lo migraremos a `useLiveQuery` de
 * Dexie React Hooks para reactividad automática a cambios de la DB.
 */
export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const all = await db.settings.toArray()
    const obj = Object.fromEntries(
      all.filter((s) => !s.key.startsWith('__')).map((s) => [s.key, s.value]),
    ) as unknown as AppSettings
    setSettings(obj)
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const setSetting = useCallback(
    async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      await db.settings.put({ key: String(key), value })
      await refresh()
    },
    [refresh],
  )

  return { settings, loading, setSetting, refresh }
}
