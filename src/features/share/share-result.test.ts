import { describe, expect, it } from 'vitest'

import { formatShareResult } from './share-result'

describe('share result', () => {
  it('crea el recorrido alfabético de una victoria sin revelar palabras', () => {
    const result = formatShareResult({
      dateKey: '2026-09-09',
      status: 'won',
      relations: ['before', 'after', 'before', 'equal'],
      maxAttempts: 10,
      url: 'https://entrele.example/',
    })

    expect(result).toBe(
      ['ENTRELE · 09.09 · 4/10', '↑ ↓ ↑ ◆', '●●●●○○○○○○', 'https://entrele.example/'].join('\n'),
    )
    expect(result).not.toMatch(/mango|radio/iu)
  })

  it('distingue una derrota sin simular una victoria en diez intentos', () => {
    const result = formatShareResult({
      dateKey: '2026-09-09',
      status: 'lost',
      relations: Array.from({ length: 10 }, (_, index) => (index % 2 === 0 ? 'before' : 'after')),
      maxAttempts: 10,
    })

    expect(result).toContain('ENTRELE · 09.09 · X/10')
    expect(result).not.toContain('◆')
    expect(result).toContain('●●●●●●●●●●')
  })
})
