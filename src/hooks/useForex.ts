import { useQuery } from '@tanstack/react-query'
import { db } from '@/db/schema'
import { format } from 'date-fns'

const FRANKFURTER_URL = 'https://api.frankfurter.app/latest?from=EUR&to=USD'
const FALLBACK_EUR_USD = 1.08

async function fetchEurUsd() {
  const today = format(new Date(), 'yyyy-MM-dd')

  // Check Dexie cache first
  const cached = await db.forexRates
    .where({ pair: 'EUR-USD', date: today })
    .first()
  if (cached) {
    return { rate: cached.rate, date: cached.date, source: cached.source, fetchedAt: cached.fetchedAt }
  }

  try {
    const res = await fetch(FRANKFURTER_URL)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const rate = data.rates?.USD ?? FALLBACK_EUR_USD
    const record = {
      pair: 'EUR-USD',
      date: today,
      rate,
      source: 'frankfurter' as const,
      fetchedAt: new Date().toISOString(),
    }
    await db.forexRates.put(record)
    return { rate, date: today, source: 'frankfurter' as const, fetchedAt: record.fetchedAt }
  } catch {
    const record = {
      pair: 'EUR-USD',
      date: today,
      rate: FALLBACK_EUR_USD,
      source: 'manual' as const,
      fetchedAt: new Date().toISOString(),
    }
    await db.forexRates.put(record)
    return { rate: FALLBACK_EUR_USD, date: today, source: 'manual' as const, fetchedAt: record.fetchedAt }
  }
}

export function useForex() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['forex-eur-usd'],
    queryFn: fetchEurUsd,
    staleTime: 60 * 60 * 1000,
  })

  return {
    eurToUsd: data?.rate ?? FALLBACK_EUR_USD,
    loading: isLoading,
    error,
    lastUpdated: data?.fetchedAt,
  }
}
