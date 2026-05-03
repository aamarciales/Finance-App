import { describe, it, expect } from 'vitest'
import { suggestCategory } from '@/lib/auto-categorize'

describe('suggestCategory', () => {
  it('matches streaming services', () => {
    expect(suggestCategory('Netflix Premium')).toBe('Servicios')
    expect(suggestCategory('Spotify Suscripción')).toBe('Servicios')
  })

  it('matches transport', () => {
    expect(suggestCategory('Uber Trip')).toBe('Transporte')
    expect(suggestCategory('Didi Express')).toBe('Transporte')
  })

  it('matches supermarkets', () => {
    expect(suggestCategory('Exito Market')).toBe('Supermercado')
    expect(suggestCategory('D1 compras')).toBe('Supermercado')
  })

  it('matches food delivery', () => {
    expect(suggestCategory('Rappi pedido')).toBe('Comida fuera')
    expect(suggestCategory('Domicilios.com')).toBe('Comida fuera')
  })

  it('matches health', () => {
    expect(suggestCategory('Farmacia Cruz Azul')).toBe('Salud')
    expect(suggestCategory('EPS Sanitas')).toBe('Salud')
  })

  it('matches education', () => {
    expect(suggestCategory('Coursera subscription')).toBe('Educación')
    expect(suggestCategory('Platzi curso React')).toBe('Educación')
  })

  it('matches housing', () => {
    expect(suggestCategory('Arriendo apartamento')).toBe('Hogar')
  })

  it('matches telecom', () => {
    expect(suggestCategory('Movistar fibra')).toBe('Servicios')
    expect(suggestCategory('Claro plan')).toBe('Servicios')
  })

  it('matches income categories', () => {
    expect(suggestCategory('Sueldo mensual')).toBe('Sueldo')
    expect(suggestCategory('Freelance proyecto web')).toBe('Freelance')
  })

  it('matches tax keywords', () => {
    expect(suggestCategory('Impuesto ICA')).toBe('Impuestos')
    expect(suggestCategory('Retefuente DIAN')).toBe('Impuestos')
  })

  it('returns null for unknown concepts', () => {
    expect(suggestCategory('Compra random xyz')).toBeNull()
    expect(suggestCategory('')).toBeNull()
  })
})
