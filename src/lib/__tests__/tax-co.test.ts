import { describe, it, expect } from 'vitest'
import {
  getUVT,
  calculateTaxObligation,
  calculateSimpleTax,
  calculateProvision,
  getPaymentCalendar,
} from '@/lib/tax-co'

describe('getUVT', () => {
  it('returns correct UVT for 2024', () => {
    expect(getUVT(2024)).toBe(48_453)
  })

  it('returns correct UVT for 2025', () => {
    expect(getUVT(2025)).toBe(49_799)
  })

  it('returns fallback for unknown year', () => {
    const uvt = getUVT(2030)
    expect(uvt).toBeGreaterThan(0)
  })
})

describe('calculateTaxObligation', () => {
  it('flags no obligation below declare threshold', () => {
    const result = calculateTaxObligation(10_000_000, 2025)
    expect(result.mustDeclare).toBe(false)
    expect(result.mustInvoice).toBe(false)
  })

  it('flags mustDeclare when above 1400 UVT', () => {
    const uvt = getUVT(2025)
    const income = Math.round(1_500 * uvt)
    const result = calculateTaxObligation(income, 2025)
    expect(result.mustDeclare).toBe(true)
    expect(result.mustInvoice).toBe(false)
  })

  it('flags mustInvoice when above 3500 UVT', () => {
    const uvt = getUVT(2025)
    const income = Math.round(4_000 * uvt)
    const result = calculateTaxObligation(income, 2025)
    expect(result.mustDeclare).toBe(true)
    expect(result.mustInvoice).toBe(true)
  })

  it('returns correct COP thresholds', () => {
    const result = calculateTaxObligation(0, 2025)
    const uvt = getUVT(2025)
    expect(result.declareThresholdCop).toBe(1_400 * uvt)
    expect(result.invoiceThresholdCop).toBe(3_500 * uvt)
  })
})

describe('calculateSimpleTax', () => {
  it('returns zero for zero income', () => {
    const result = calculateSimpleTax(0, 2025)
    expect(result.totalTaxCop).toBe(0)
    expect(result.effectiveRate).toBe(0)
    expect(result.taxByBracket).toHaveLength(0)
  })

  it('applies only first bracket for small income', () => {
    const uvt = getUVT(2025)
    const income = 500 * uvt // within first bracket (0–1250 UVT)
    const result = calculateSimpleTax(income, 2025)
    expect(result.taxByBracket).toHaveLength(1)
    expect(result.taxByBracket[0].rate).toBe(0.015)
    expect(result.totalTaxCop).toBe(Math.round(500 * uvt * 0.015))
  })

  it('applies multiple brackets for larger income', () => {
    const uvt = getUVT(2025)
    const income = 3_000 * uvt // spans 3 brackets
    const result = calculateSimpleTax(income, 2025)
    expect(result.taxByBracket.length).toBeGreaterThanOrEqual(2)
    expect(result.totalTaxCop).toBeGreaterThan(0)
    expect(result.effectiveRate).toBeGreaterThan(0)
    expect(result.effectiveRate).toBeLessThan(0.059)
  })

  it('computes effective rate correctly', () => {
    const uvt = getUVT(2025)
    const income = 2_000 * uvt
    const result = calculateSimpleTax(income, 2025)
    const expectedRate = result.totalTaxCop / income
    expect(result.effectiveRate).toBeCloseTo(expectedRate, 6)
  })
})

describe('calculateProvision', () => {
  it('returns 2% by default', () => {
    expect(calculateProvision(50_000_000)).toBe(1_000_000)
  })

  it('supports custom rate', () => {
    expect(calculateProvision(50_000_000, 0.05)).toBe(2_500_000)
  })

  it('returns 0 for zero income', () => {
    expect(calculateProvision(0)).toBe(0)
  })
})

describe('getPaymentCalendar', () => {
  it('returns 6 bimesters', () => {
    const calendar = getPaymentCalendar(2025)
    expect(calendar).toHaveLength(6)
  })

  it('first bimester is Jan-Feb', () => {
    const calendar = getPaymentCalendar(2025)
    expect(calendar[0].label).toBe('Bimestre 1')
    expect(calendar[0].months).toContain('Ene')
    expect(calendar[0].months).toContain('Feb')
  })

  it('last bimester is Nov-Dic', () => {
    const calendar = getPaymentCalendar(2025)
    expect(calendar[5].label).toBe('Bimestre 6')
    expect(calendar[5].months).toContain('Nov')
    expect(calendar[5].months).toContain('Dic')
  })

  it('includes year in months', () => {
    const calendar = getPaymentCalendar(2025)
    expect(calendar[0].months).toContain('2025')
  })
})
