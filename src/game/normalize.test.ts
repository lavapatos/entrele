import { describe, expect, it } from 'vitest'

import { normalizeInput } from './normalize'

describe('normalizeInput', () => {
  it('tolera mayúsculas, espacios exteriores y tildes', () => {
    expect(normalizeInput('  ÁRBOL  ')).toEqual({ ok: true, inputKey: 'arbol' })
    expect(normalizeInput('avión')).toEqual({ ok: true, inputKey: 'avion' })
    expect(normalizeInput('PINGÜINO')).toEqual({ ok: true, inputKey: 'pinguino' })
  })

  it('conserva la ñ incluso si llega en Unicode descompuesto', () => {
    expect(normalizeInput('NIÑEZ')).toEqual({ ok: true, inputKey: 'niñez' })
    expect(normalizeInput('NIN\u0303EZ')).toEqual({ ok: true, inputKey: 'niñez' })
    expect(normalizeInput('NINEZ')).toEqual({ ok: true, inputKey: 'ninez' })
  })

  it('rechaza vacío y caracteres ajenos a palabras simples', () => {
    expect(normalizeInput('   ')).toEqual({ ok: false, reason: 'empty' })
    expect(normalizeInput('a-bcd')).toEqual({ ok: false, reason: 'invalid-characters' })
    expect(normalizeInput('ab3ja')).toEqual({ ok: false, reason: 'invalid-characters' })
  })
})
