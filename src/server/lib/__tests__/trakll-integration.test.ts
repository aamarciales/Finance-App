import { describe, it, expect } from 'vitest'
import { centsToPatrimonioAmount, trakllExternalRef } from '../trakll-integration'

describe('trakllExternalRef', () => {
  it('builds a stable idempotency key in notes', () => {
    expect(trakllExternalRef('abc-123')).toBe('trakll:invoice:abc-123')
  })
})

describe('centsToPatrimonioAmount', () => {
  it('converts trakll cents to patrimonio decimal amount', () => {
    expect(centsToPatrimonioAmount(150000)).toBe(1500)
    expect(centsToPatrimonioAmount(99)).toBe(0.99)
  })
})
