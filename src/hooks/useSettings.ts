import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/schema'
import type { AppSettings } from '@/types/domain'

export function useSettings() {
  const settings = useLiveQuery(async (): Promise<AppSettings> => {
    const all = await db.settings.toArray()
    return Object.fromEntries(
      all.filter((s) => !s.key.startsWith('__')).map((s) => [s.key, s.value]),
    ) as unknown as AppSettings
  })

  async function setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    await db.settings.put({ key: String(key), value })
  }

  return { settings: settings ?? null, loading: settings === undefined, setSetting }
}
