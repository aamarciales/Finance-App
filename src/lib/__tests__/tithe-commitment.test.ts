import { describe, expect, it } from 'vitest'
import {
  commitmentPaymentShortfall,
  computeTitheAmounts,
  isCommitmentFullyPaid,
  resolveCommitmentStatus,
} from '../../server/lib/tithe-commitment'
import { shouldGenerateTitheCommitment } from '../tithe-exemption'

describe('tithe exemption', () => {
  it('skips commitment for exempt income', () => {
    expect(shouldGenerateTitheCommitment(null)).toBe(true)
    expect(shouldGenerateTitheCommitment('exempt')).toBe(false)
    expect(shouldGenerateTitheCommitment('already_tithed')).toBe(false)
    expect(shouldGenerateTitheCommitment('loan_proceeds')).toBe(false)
  })
})

describe('isCommitmentFullyPaid', () => {
  it('accepts small TRM drift', () => {
    expect(isCommitmentFullyPaid(49.5, 50)).toBe(true)
    expect(isCommitmentFullyPaid(48, 50)).toBe(false)
  })
})

describe('resolveCommitmentStatus', () => {
  it('marks complete when user confirms full payment', () => {
    expect(resolveCommitmentStatus(10, 50, 'pending', true)).toBe('paid')
  })

  it('keeps stored paid status even when USD total differs', () => {
    expect(resolveCommitmentStatus(129.56, 188.7, 'paid', false)).toBe('paid')
  })

  it('keeps debt when unpaid', () => {
    expect(resolveCommitmentStatus(0, 50, 'debt', false)).toBe('debt')
  })
})

describe('commitmentPaymentShortfall', () => {
  it('returns remaining USD for TRM drift top-up', () => {
    expect(commitmentPaymentShortfall(129.56, 188.7)).toBe(59.14)
  })
})

describe('computeTitheAmounts', () => {
  it('uses category overrides', () => {
    const result = computeTitheAmounts(100, 5, {
      defaultTithe: 10,
      defaultOffering: 10,
      tithePercentByIncomeCategory: { 5: { tithe: 0, offering: 0 } },
    })
    expect(result.tithe).toBe(0)
    expect(result.offering).toBe(0)
  })
})
