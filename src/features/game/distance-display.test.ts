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

  it('amplía visualmente las distancias pequeñas sin alterar el porcentaje', () => {
    expect(getDistanceMarkerPosition(0, 'after')).toBe(86)
    expect(getDistanceMarkerPosition(0.01, 'after')).toBeLessThan(75)
    expect(getDistanceMarkerPosition(0.01, 'after')).toBeGreaterThan(14)
    expect(getDistanceMarkerPosition(1, 'after')).toBeLessThan(
      getDistanceMarkerPosition(0.01, 'after'),
    )
    expect(getDistanceMarkerPosition(100, 'after')).toBe(14)
    expect(getDistanceMarkerPosition(0, 'equal')).toBe(50)
  })

  it('acerca el indicador al límite que actualizó la palabra probada', () => {
    const nearLowerBound = getDistanceMarkerPosition(0.01, 'before')
    const nearUpperBound = getDistanceMarkerPosition(0.01, 'after')

    expect(nearLowerBound).toBeLessThan(50)
    expect(nearUpperBound).toBeGreaterThan(50)
    expect(nearLowerBound + nearUpperBound).toBeCloseTo(100)
  })
})
