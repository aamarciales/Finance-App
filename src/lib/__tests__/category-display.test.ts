import { describe, expect, it } from 'vitest'
import { displayCategoryName, displayTransactionConcept } from '../category-display'

describe('displayCategoryName', () => {
  it('maps Spanish system category names to English', () => {
    expect(displayCategoryName('Supermercado')).toBe('Groceries')
    expect(displayCategoryName('Custom')).toBe('Custom')
  })
})

describe('displayTransactionConcept', () => {
  it('maps legacy trakll-sync "Factura …" concepts to Invoice', () => {
    expect(displayTransactionConcept('Factura 000010')).toBe('Invoice 000010')
    expect(displayTransactionConcept('Factura 2026-001 · Acme Corp')).toBe(
      'Invoice 2026-001 · Acme Corp',
    )
  })

  it('is case-insensitive on the Factura prefix', () => {
    expect(displayTransactionConcept('factura 000010')).toBe('Invoice 000010')
  })

  it('leaves other concepts unchanged', () => {
    expect(displayTransactionConcept('Invoice 2026-001 · Acme Corp')).toBe(
      'Invoice 2026-001 · Acme Corp',
    )
    expect(displayTransactionConcept('Lunch at La Puerta Falsa')).toBe(
      'Lunch at La Puerta Falsa',
    )
  })
})
