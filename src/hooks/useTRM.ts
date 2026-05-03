import { useQuery } from '@tanstack/react-query'
import { db } from '@/db/schema'
import { format } from 'date-fns'

const TRM_API = 'https://www.datos.gov.co/resource/32sa-8pi3.json'
const FALLBACK_TRM = 4200

async function fetchTRM() {
  const today = format(new Date(), 'yyyy-MM-dd')

  // Check Dexie cache first
  const cached = await db.trmRecords.get(today)
  if (cached) {
    return { rate: cached.rate, date: cached.date, source: cached.source, fetchedAt: cached.fetchedAt }
  }

  try {
    const res = await fetch(TRM_API)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const rate = data?.[0]?.valor ?? FALLBACK_TRM
    const record = {
      date: today,
      rate,
      source: 'banrep' as const,
      fetchedAt: new Date().toISOString(),
    }
    await db.trmRecords.put(record)
    return { rate, date: today, source: 'banrep' as const, fetchedAt: record.fetchedAt }
  } catch {
    const record = {
      date: today,
      rate: FALLBACK_TRM,
      source: 'manual' as const,
      fetchedAt: new Date().toISOString(),
    }
    await db.trmRecords.put(record)
    return { rate: FALLBACK_TRM, date: today, source: 'manual' as const, fetchedAt: record.fetchedAt }
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
