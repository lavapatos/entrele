import { describe, expect, it } from 'vitest'

import { formatDistancePercentage, getDistanceMarkerPosition } from './distance-display'

describe('presentación de distancia', () => {
  it('aumenta la precisión solo para porcentajes cercanos', () => {
    expect(formatDistancePercentage(0)).toBe('0%')
    expect(formatDistancePercentage(0.0122)).toBe('0.01%')
    expect(formatDistancePercentage(0.378)).toBe('0.38%')
    expect(formatDistancePercentage(2.44)).toBe('2.4%')
    expect(formatDistancePercentage(4)).toBe('4%')
    expect(formatDistancePercentage(5.4)).toBe('5%')
    expect(formatDistancePercentage(18.7)).toBe('19%')
  })

  it('sitúa la respuesta proporcionalmente dentro del intervalo visible', () => {
    expect(getDistanceMarkerPosition(0)).toBe(14)
    expect(getDistanceMarkerPosition(25)).toBe(32)
    expect(getDistanceMarkerPosition(50)).toBe(50)
    expect(getDistanceMarkerPosition(75)).toBe(68)
    expect(getDistanceMarkerPosition(100)).toBe(86)
  })

  it('limita posiciones externas a los extremos de la guía', () => {
    expect(getDistanceMarkerPosition(-20)).toBe(14)
    expect(getDistanceMarkerPosition(120)).toBe(86)
  })
})
