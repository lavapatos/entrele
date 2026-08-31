import { describe, expect, it } from 'vitest'

import { createDictionary, getDictionaryEntry } from './dictionary'

describe('createDictionary', () => {
  it('asigna rankings estables según el orden recibido', () => {
    const dictionary = createDictionary(['ábaco', 'abeja', 'árbol'], 5)

    expect(
      dictionary.entries.map(({ display, inputKey, sortRank }) => ({
        display,
        inputKey,
        sortRank,
      })),
    ).toEqual([
      { display: 'ábaco', inputKey: 'abaco', sortRank: 0 },
      { display: 'abeja', inputKey: 'abeja', sortRank: 1 },
      { display: 'árbol', inputKey: 'arbol', sortRank: 2 },
    ])
    expect(getDictionaryEntry(dictionary, 'arbol')?.display).toBe('árbol')
  })

  it('rechaza claves ambiguas en vez de escoger una silenciosamente', () => {
    expect(() => createDictionary(['árbol', 'arbol'], 5)).toThrow(
      'La clave de entrada "arbol" está duplicada.',
    )
  })

  it('rechaza entradas con una longitud diferente', () => {
    expect(() => createDictionary(['sol'], 5)).toThrow('La entrada "sol" no tiene 5 letras.')
  })
})
