import { countLetters, normalizeInput } from './normalize'
import type { DictionaryEntry, GameDictionary } from './types'

export function createDictionary(
  displayWords: readonly string[],
  wordLength: number,
): GameDictionary {
  if (!Number.isInteger(wordLength) || wordLength <= 0) {
    throw new Error('La longitud del diccionario debe ser un entero positivo.')
  }

  if (displayWords.length === 0) {
    throw new Error('El diccionario no puede estar vacío.')
  }

  const entriesByInputKey: Record<string, DictionaryEntry> = Object.create(null) as Record<
    string,
    DictionaryEntry
  >

  const entries = displayWords.map((display, sortRank) => {
    if (display !== display.trim()) {
      throw new Error(`La entrada "${display}" tiene espacios exteriores.`)
    }

    const normalized = normalizeInput(display)

    if (!normalized.ok) {
      throw new Error(`La entrada "${display}" contiene caracteres no admitidos.`)
    }

    if (countLetters(normalized.inputKey) !== wordLength) {
      throw new Error(`La entrada "${display}" no tiene ${wordLength} letras.`)
    }

    if (entriesByInputKey[normalized.inputKey]) {
      throw new Error(`La clave de entrada "${normalized.inputKey}" está duplicada.`)
    }

    const entry: DictionaryEntry = Object.freeze({
      display,
      inputKey: normalized.inputKey,
      sortRank,
    })

    entriesByInputKey[entry.inputKey] = entry
    return entry
  })

  return Object.freeze({
    entries: Object.freeze(entries),
    entriesByInputKey: Object.freeze(entriesByInputKey),
    wordLength,
  })
}

export function getDictionaryEntry(
  dictionary: GameDictionary,
  inputKey: string,
): DictionaryEntry | null {
  return dictionary.entriesByInputKey[inputKey] ?? null
}
