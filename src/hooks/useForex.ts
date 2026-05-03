import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'

const FRANKFURTER_URL = 'https://api.frankfurter.app/latest?from=EUR&to=USD'
const FALLBACK_EUR_USD = 1.08

async function fetchEurUsd() {
  const today = format(new Date(), 'yyyy-MM-dd')

  try {
    const res = await fetch(FRANKFURTER_URL)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const rate = data.rates?.USD ?? FALLBACK_EUR_USD
    
    return { rate, date: today, source: 'frankfurter' as const, fetchedAt: new Date().toISOString() }
  } catch {
    return { rate: FALLBACK_EUR_USD, date: today, source: 'manual' as const, fetchedAt: new Date().toISOString() }
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
