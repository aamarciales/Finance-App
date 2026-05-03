import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'

const TRM_API = 'https://www.datos.gov.co/resource/32sa-8pi3.json'
const FALLBACK_TRM = 4200

async function fetchTRM() {
  const today = format(new Date(), 'yyyy-MM-dd')

  try {
    const res = await fetch(TRM_API)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const rate = data?.[0]?.valor ?? FALLBACK_TRM
    return { 
      rate, 
      date: today, 
      source: 'banrep' as const, 
      fetchedAt: new Date().toISOString() 
    }
  } catch {
    return { 
      rate: FALLBACK_TRM, 
      date: today, 
      source: 'manual' as const, 
      fetchedAt: new Date().toISOString() 
    }
  }
}

export function useTRM() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['trm'],
    queryFn: fetchTRM,
    staleTime: 60 * 60 * 1000, // 1 hour
  })

  return {
    rate: data?.rate ?? FALLBACK_TRM,
    date: data?.date ?? format(new Date(), 'yyyy-MM-dd'),
    source: data?.source ?? 'manual',
    loading: isLoading,
    error,
    lastUpdated: data?.fetchedAt,
  }
}
