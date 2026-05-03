// UVT values by year — update annually from DIAN resolution
const UVT_BY_YEAR: Record<number, number> = {
  2024: 48_453,
  2025: 49_799,
  2026: 49_799, // TODO: verify when DIAN publishes
}

export function getUVT(year: number): number {
  return UVT_BY_YEAR[year] ?? UVT_BY_YEAR[2026] ?? 49_799
}

// Obligation thresholds in UVT
const DECLARE_RENT_THRESHOLD_UVT = 1_400
const INVOICE_THRESHOLD_UVT = 3_500

export interface TaxObligation {
  mustDeclare: boolean
  mustInvoice: boolean
  declareThresholdCop: number
  invoiceThresholdCop: number
}

export function calculateTaxObligation(annualIncomeCop: number, year = 2026): TaxObligation {
  const uvt = getUVT(year)
  const declareThresholdCop = DECLARE_RENT_THRESHOLD_UVT * uvt
  const invoiceThresholdCop = INVOICE_THRESHOLD_UVT * uvt
  return {
    mustDeclare: annualIncomeCop > declareThresholdCop,
    mustInvoice: annualIncomeCop > invoiceThresholdCop,
    declareThresholdCop,
    invoiceThresholdCop,
  }
}

// Régimen Simple de Tributación (REST) — marginal rates per UVT bracket
const SIMPLE_BRACKETS = [
  { from: 0, to: 1_250, rate: 0.015 },
  { from: 1_250, to: 2_500, rate: 0.020 },
  { from: 2_500, to: 5_000, rate: 0.040 },
  { from: 5_000, to: Infinity, rate: 0.059 },
]

export interface SimpleTaxResult {
  taxByBracket: Array<{ from: number; to: number; rate: number; taxableUvt: number; taxCop: number }>
  totalTaxCop: number
  effectiveRate: number
}

export function calculateSimpleTax(incomeCop: number, year = 2026): SimpleTaxResult {
  const uvt = getUVT(year)
  const incomeUvt = incomeCop / uvt

  let remainingUvt = incomeUvt
  const taxByBracket: SimpleTaxResult['taxByBracket'] = []
  let totalTaxCop = 0

  for (const bracket of SIMPLE_BRACKETS) {
    if (remainingUvt <= 0) break
    const bracketWidth = bracket.to === Infinity ? remainingUvt : bracket.to - bracket.from
    const taxable = Math.min(remainingUvt, bracketWidth)
    const taxCop = taxable * uvt * bracket.rate
    taxByBracket.push({
      from: bracket.from,
      to: bracket.to === Infinity ? Infinity : bracket.to,
      rate: bracket.rate,
      taxableUvt: Math.round(taxable * 100) / 100,
      taxCop: Math.round(taxCop),
    })
    totalTaxCop += taxCop
    remainingUvt -= taxable
  }

  return {
    taxByBracket,
    totalTaxCop: Math.round(totalTaxCop),
    effectiveRate: incomeCop > 0 ? totalTaxCop / incomeCop : 0,
  }
}

export interface BimonthlyPeriod {
  label: string
  months: string
  dueMonth: string
}

export function getPaymentCalendar(year: number): BimonthlyPeriod[] {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const periods: BimonthlyPeriod[] = []
  for (let i = 0; i < 12; i += 2) {
    const label = `Bimestre ${i / 2 + 1}`
    const monthRange = `${months[i]}-${months[i + 1]}`
    const dueIdx = Math.min(i + 3, 11)
    periods.push({
      label,
      months: `${monthRange} ${year}`,
      dueMonth: `${months[dueIdx]}`,
    })
  }
  return periods
}

export function calculateProvision(annualIncomeCop: number, rate = 0.02): number {
  return Math.round(annualIncomeCop * rate)
}
