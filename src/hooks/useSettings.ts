import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/lib/api'
import { useAuthReady } from '@/hooks/useAuthReady'
import type { AppSettings, TitheConfig, TaxProfile } from '@/types/domain'

const DEFAULT_TITHE_CONFIG: TitheConfig = {
  tithePercentByIncomeCategory: {},
  defaultTithe: 10,
  defaultOffering: 10,
  destination: 'Iglesia local',
}

const DEFAULT_TAX_PROFILE: TaxProfile = {
  residentStatus: 'resident',
  regime: 'none',
  activityCode: '',
  isVATResponsible: false,
  validatedByAccountant: false,
}

const DEFAULT_SETTINGS: AppSettings = {
  baseCurrency: 'USD',
  secondaryCurrency: 'COP',
  displayName: 'Usuario',
  titheConfig: DEFAULT_TITHE_CONFIG,
  taxProfile: DEFAULT_TAX_PROFILE,
  ocrProvider: 'off',
  autoCategorize: true,
  monthlyTaxProvisionRate: 0.02,
}

export function useSettings() {
  const api = useApi()
  const authReady = useAuthReady()
  const queryClient = useQueryClient()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    enabled: authReady,
    queryFn: async (): Promise<AppSettings> => {
      const all: any[] = await api.get('/settings')
      const fromApi = Object.fromEntries(
        all.filter((s) => !s.key.startsWith('__')).map((s) => [s.key, s.value]),
      ) as Partial<AppSettings>

      return {
        ...DEFAULT_SETTINGS,
        ...fromApi,
        titheConfig: {
          ...DEFAULT_TITHE_CONFIG,
          ...(fromApi.titheConfig ?? {}),
        },
        taxProfile: {
          ...DEFAULT_TAX_PROFILE,
          ...(fromApi.taxProfile ?? {}),
        },
      }
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
