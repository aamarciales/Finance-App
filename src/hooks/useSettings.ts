import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/lib/api'
import type { AppSettings } from '@/types/domain'

export function useSettings() {
  const api = useApi()
  const queryClient = useQueryClient()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async (): Promise<AppSettings> => {
      const all: any[] = await api.get('/settings')
      return Object.fromEntries(
        all.filter((s) => !s.key.startsWith('__')).map((s) => [s.key, s.value]),
      ) as unknown as AppSettings
    },
  })

  const { mutateAsync: setSettingMutate } = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      await api.put(`/settings/${key}`, value)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })

  async function setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    await setSettingMutate({ key: String(key), value })
  }

  return { settings: settings ?? null, loading: isLoading, setSetting }
}
