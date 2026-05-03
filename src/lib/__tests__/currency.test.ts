import { describe, it, expect } from 'vitest'
import { convertAmount, getEquivalentAmounts } from '@/lib/currency'

const rates = { trm: 4200, eurToUsd: 1.08 }

describe('convertAmount', () => {
  it('returns same amount when from === to', () => {
    expect(convertAmount(100, 'USD', 'USD', rates)).toBe(100)
    expect(convertAmount(50000, 'COP', 'COP', rates)).toBe(50000)
  })

  it('converts USD to COP', () => {
    expect(convertAmount(100, 'USD', 'COP', rates)).toBe(420000)
  })

  it('converts COP to USD', () => {
    expect(convertAmount(420000, 'COP', 'USD', rates)).toBe(100)
  })

  it('converts EUR to USD', () => {
    expect(convertAmount(100, 'EUR', 'USD', rates)).toBe(108)
  })

  it('converts EUR to COP', () => {
    // 100 EUR → 108 USD → 453600 COP
    expect(convertAmount(100, 'EUR', 'COP', rates)).toBe(453600)
  })
})

describe('getEquivalentAmounts', () => {
  it('returns identity for USD amount', () => {
    const result = getEquivalentAmounts(100, 'USD', rates)
    expect(result.amountInBase).toBe(100)
    expect(result.amountInSecondary).toBe(420000)
  })

  it('converts COP to USD base', () => {
    const result = getEquivalentAmounts(420000, 'COP', rates)
    expect(result.amountInBase).toBe(100)
    expect(result.amountInSecondary).toBe(420000)
  })

  it('converts EUR to both USD and COP', () => {
    const result = getEquivalentAmounts(100, 'EUR', rates)
    expect(result.amountInBase).toBe(108) // 100 * 1.08
    expect(result.amountInSecondary).toBe(453600) // 108 * 4200
  })

  it('COP amount returns as-is for secondary', () => {
    const result = getEquivalentAmounts(50000, 'COP', rates)
    expect(result.amountInSecondary).toBe(50000)
  })
})
