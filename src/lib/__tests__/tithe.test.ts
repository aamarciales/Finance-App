import { describe, it, expect } from 'vitest'
import { calculateTitheForIncome } from '@/lib/tithe'
import type { AppSettings } from '@/types/domain'

const makeSettings = (overrides: Partial<AppSettings> = {}): AppSettings => ({
  displayName: 'Test',
  baseCurrency: 'USD',
  secondaryCurrency: 'COP',
  titheConfig: {
    defaultTithe: 10,
    defaultOffering: 0,
    destination: 'Iglesia local',
    tithePercentByIncomeCategory: {},
  },
  taxProfile: {
    residentStatus: 'resident',
    regime: 'simple',
    activityCode: '',
    isVATResponsible: false,
    validatedByAccountant: false,
  },
  ocrProvider: 'off',
  autoCategorize: true,
  monthlyTaxProvisionRate: 0.02,
  ...overrides,
})

describe('calculateTitheForIncome', () => {
  it('returns 0 for zero amount', () => {
    const result = calculateTitheForIncome(0, 1, makeSettings())
    expect(result).toEqual({ tithe: 0, offering: 0 })
  })

  it('returns 0 for negative amount', () => {
    const result = calculateTitheForIncome(-100, 1, makeSettings())
    expect(result).toEqual({ tithe: 0, offering: 0 })
  })

  it('applies default 10% when settings is undefined', () => {
    const result = calculateTitheForIncome(1000, 1, undefined)
    expect(result).toEqual({ tithe: 100, offering: 0 })
  })

  it('applies default 10% tithe', () => {
    const result = calculateTitheForIncome(1000, 1, makeSettings())
    expect(result.tithe).toBe(100)
    expect(result.offering).toBe(0)
  })

  it('applies custom default tithe and offering', () => {
    const settings = makeSettings({
      titheConfig: {
        defaultTithe: 8,
        defaultOffering: 2,
        destination: 'Iglesia local',
        tithePercentByIncomeCategory: {},
      },
    })
    const result = calculateTitheForIncome(1000, 1, settings)
    expect(result.tithe).toBe(80)
    expect(result.offering).toBe(20)
  })

  it('applies per-category override', () => {
    const settings = makeSettings({
      titheConfig: {
        defaultTithe: 10,
        defaultOffering: 0,
        destination: 'Iglesia local',
        tithePercentByIncomeCategory: {
          5: { tithe: 5, offering: 1 },
        },
      },
    })
    const result = calculateTitheForIncome(1000, 5, settings)
    expect(result.tithe).toBe(50)
    expect(result.offering).toBe(10)
  })

  it('falls back to default when category has no override', () => {
    const settings = makeSettings({
      titheConfig: {
        defaultTithe: 10,
        defaultOffering: 0,
        destination: 'Iglesia local',
        tithePercentByIncomeCategory: {
          5: { tithe: 5, offering: 1 },
        },
      },
    })
    const result = calculateTitheForIncome(1000, 9, settings)
    expect(result.tithe).toBe(100)
    expect(result.offering).toBe(0)
  })

  it('handles undefined categoryId with default', () => {
    const result = calculateTitheForIncome(1000, undefined, makeSettings())
    expect(result.tithe).toBe(100)
  })
})
