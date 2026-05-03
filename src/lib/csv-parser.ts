import Papa from 'papaparse'

export type DetectedBank = 'bancolombia' | 'davivienda' | 'wise' | 'binance_p2p' | 'unknown'

export interface ParsedTransaction {
  date: string
  concept: string
  amount: number
  currency: 'COP' | 'USD' | 'EUR'
  originalData: Record<string, string>
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/['"]/g, '')
}

export function detectBank(csv: string): DetectedBank {
  const lines = csv.split('\n').slice(0, 5)
  const text = lines.join('\n').toLowerCase()

  // Bancolombia: uses semicolons, specific Spanish headers
  if (text.includes('fecha') && text.includes('descripción') && text.includes('valor') && text.includes('saldo')) {
    if (csv.includes(';')) return 'bancolombia'
  }

  // Davivienda: similar headers but comma-separated
  if (text.includes('fecha') && text.includes('descripcion') && text.includes('valor')) {
    if (csv.includes(',')) return 'davivienda'
  }

  // Wise: English headers
  if (text.includes('date') && text.includes('description') && text.includes('amount') && text.includes('currency')) {
    return 'wise'
  }

  // Binance P2P
  if (text.includes('order') && text.includes('type') && text.includes('asset') && text.includes('fiat')) {
    return 'binance_p2p'
  }

  return 'unknown'
}

export function parseCSV(csv: string, bank: DetectedBank): ParsedTransaction[] {
  switch (bank) {
    case 'bancolombia': return parseBancolombia(csv)
    case 'davivienda': return parseDavivienda(csv)
    case 'wise': return parseWise(csv)
    case 'binance_p2p': return parseBinanceP2P(csv)
    default: return []
  }
}

function parseBancolombia(csv: string): ParsedTransaction[] {
  const result = Papa.parse<Record<string, string>>(csv, {
    header: true,
    delimiter: ';',
    skipEmptyLines: true,
  })

  return result.data
    .filter(row => row['Fecha'] || row['fecha'])
    .map(row => {
      const rawDate = (row['Fecha'] ?? row['fecha'] ?? '').trim()
      const date = parseLatinDate(rawDate)
      const concept = (row['Descripción'] ?? row['descripcion'] ?? '').trim()
      const rawValue = (row['Valor'] ?? row['valor'] ?? '').trim()
      const amount = parseColombianAmount(rawValue)
      return { date, concept, amount, currency: 'COP' as const, originalData: row }
    })
    .filter(tx => tx.concept && !isNaN(tx.amount))
}

function parseDavivienda(csv: string): ParsedTransaction[] {
  const result = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
  })

  return result.data
    .filter(row => {
      const headers = Object.keys(row).map(normalizeHeader)
      return row[headers.find(h => h === 'fecha') ?? '']
    })
    .map(row => {
      const headers = Object.keys(row)
      const dateKey = headers.find(h => normalizeHeader(h) === 'fecha') ?? ''
      const descKey = headers.find(h => normalizeHeader(h) === 'descripcion') ?? ''
      const valKey = headers.find(h => normalizeHeader(h) === 'valor') ?? ''

      const date = parseLatinDate(row[dateKey]?.trim() ?? '')
      const concept = row[descKey]?.trim() ?? ''
      const amount = parseColombianAmount(row[valKey]?.trim() ?? '')
      return { date, concept, amount, currency: 'COP' as const, originalData: row }
    })
    .filter(tx => tx.concept && !isNaN(tx.amount))
}

function parseWise(csv: string): ParsedTransaction[] {
  const result = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
  })

  return result.data
    .filter(row => row['Date'])
    .map(row => {
      const date = row['Date']!.trim()
      const concept = row['Description']?.trim() ?? ''
      const rawAmount = row['Amount']?.trim() ?? ''
      const amount = parseFloat(rawAmount.replace(',', '')) || 0
      const currency = (row['Currency']?.trim()?.toUpperCase() ?? 'USD') as 'COP' | 'USD' | 'EUR'
      return { date, concept, amount, currency, originalData: row }
    })
    .filter(tx => tx.concept && tx.amount !== 0)
}

function parseBinanceP2P(csv: string): ParsedTransaction[] {
  const result = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
  })

  return result.data
    .filter(row => row['Order Number'] || row['Created At'])
    .map(row => {
      const rawDate = (row['Created At'] ?? '').trim().split(' ')[0] ?? ''
      const type = (row['Type'] ?? '').trim().toLowerCase()
      const asset = (row['Asset'] ?? '').trim()
      const rawTotal = (row['Total'] ?? '').trim()
      const total = parseFloat(rawTotal.replace(/,/g, '')) || 0
      const amount = type === 'buy' ? -total : total
      const counterpart = row['Counterpart']?.trim() ?? ''
      const concept = `${type === 'buy' ? 'Compra' : 'Venta'} ${asset} · ${counterpart}`
      return { date: rawDate, concept, amount, currency: 'COP' as const, originalData: row }
    })
    .filter(tx => tx.concept && tx.amount !== 0)
}

/** Parse DD/MM/YYYY to YYYY-MM-DD */
function parseLatinDate(raw: string): string {
  const m = raw.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/)
  if (!m) return raw
  const [, d, mo, y] = m
  return `${y}-${mo!.padStart(2, '0')}-${d!.padStart(2, '0')}`
}

/** Parse Colombian-formatted amounts like "-$312.450" or "$2.500.000,50" */
function parseColombianAmount(raw: string): number {
  if (!raw) return NaN
  const negative = raw.includes('-')
  // Remove $, spaces, and thousands dots; replace comma decimal with dot
  const cleaned = raw.replace(/[$\s]/g, '').replace(/\./g, '').replace(',', '.')
  const num = parseFloat(cleaned)
  return negative ? -Math.abs(num) : num
}

export const BANK_LABELS: Record<DetectedBank, string> = {
  bancolombia: 'Bancolombia',
  davivienda: 'Davivienda',
  wise: 'Wise',
  binance_p2p: 'Binance P2P',
  unknown: 'Desconocido',
}
