import { describe, it, expect } from 'vitest'
import { calculateTitheForIncome } from './tithe'
import type { AppSettings } from '@/types/domain'

function makeSettings(overrides?: Partial<AppSettings['titheConfig']>): AppSettings {
  return {
    baseCurrency: 'USD',
    secondaryCurrency: 'COP',
    displayName: 'Test',
    titheConfig: {
      tithePercentByIncomeCategory: {
        1: { tithe: 10, offering: 5 },
      },
      defaultTithe: 10,
      defaultOffering: 10,
      destination: 'Iglesia local',
      ...overrides,
    },
    taxProfile: {
      residentStatus: 'resident',
      regime: 'simple',
      activityCode: '',
      isVATResponsible: false,
      validatedByAccountant: false,
    },
    ocrProvider: 'off',
    autoCategorize: false,
    monthlyTaxProvisionRate: 0.02,
  }
}

describe('calculateTitheForIncome', () => {
  it('returns 0 for amount = 0', () => {
    const settings = makeSettings()
    const result = calculateTitheForIncome(0, 1, settings)
    expect(result.tithe).toBe(0)
    expect(result.offering).toBe(0)
  })

  it('uses category-specific percent when available', () => {
    const settings = makeSettings()
    // categoryId 1 has tithe: 10, offering: 5
    const result = calculateTitheForIncome(100, 1, settings)
    expect(result.tithe).toBe(10)
    expect(result.offering).toBe(5)
  })

  it('falls back to default when category not found', () => {
    const settings = makeSettings()
    // categoryId 999 is not in tithePercentByIncomeCategory
    const result = calculateTitheForIncome(100, 999, settings)
    expect(result.tithe).toBe(10) // defaultTithe
    expect(result.offering).toBe(10) // defaultOffering
  })

  it('handles empty tithePercentByIncomeCategory', () => {
    const settings = makeSettings({ tithePercentByIncomeCategory: {} })
    const result = calculateTitheForIncome(200, 1, settings)
    expect(result.tithe).toBe(20)
    expect(result.offering).toBe(20)
  })

  it('rounds to 2 decimals', () => {
    const settings = makeSettings()
    const result = calculateTitheForIncome(33.33, 1, settings)
    expect(Number.isFinite(result.tithe)).toBe(true)
    expect(result.tithe.toString().split('.')[1]?.length ?? 0).toBeLessThanOrEqual(2)
  })
})
