import { DAILY_TIME_ZONE, DEFAULT_MAX_ATTEMPTS, WORD_LENGTH } from './constants'
import { selectDailyAnswer } from './daily'
import { createDictionary, getDictionaryEntry } from './dictionary'
import { createGame } from './engine'
import type { DictionaryEntry, GameState } from './types'

const PROTOTYPE_WORDS = [
  'ábaco',
  'abeja',
  'acero',
  'actor',
  'agudo',
  'alado',
  'altar',
  'amigo',
  'ancho',
  'andar',
  'antes',
  'árbol',
  'arena',
  'avión',
  'barco',
  'beber',
  'broma',
  'cable',
  'campo',
  'canto',
  'cerca',
  'cielo',
  'claro',
  'cobre',
  'comer',
  'dulce',
  'fuego',
  'gatos',
  'huevo',
  'jugar',
  'lápiz',
  'limón',
  'llave',
  'mango',
  'miedo',
  'mundo',
  'nacer',
  'nieve',
  'niñez',
  'nubes',
  'ñandú',
  'oasis',
  'oveja',
  'papas',
  'perro',
  'queso',
  'radio',
  'señal',
  'tarde',
  'unido',
  'viaje',
  'yogur',
  'zorro',
] as const

const PROTOTYPE_ANSWER_KEYS = [
  'mango',
  'cielo',
  'abeja',
  'radio',
  'viaje',
  'dulce',
  'señal',
] as const
const PROTOTYPE_EPOCH_DATE = '2026-01-01'

export const PROTOTYPE_DICTIONARY = createDictionary(PROTOTYPE_WORDS, WORD_LENGTH)
export const PROTOTYPE_ANSWERS = Object.freeze(PROTOTYPE_ANSWER_KEYS.map(requirePrototypeEntry))

export type PrototypeSession = Readonly<{
  dateKey: string
  game: GameState
}>

export function createPrototypeSession(now: Date = new Date()): PrototypeSession {
  const daily = selectDailyAnswer(
    {
      answers: PROTOTYPE_ANSWERS,
      epochDate: PROTOTYPE_EPOCH_DATE,
      timeZone: DAILY_TIME_ZONE,
    },
    () => now,
  )

  return {
    dateKey: daily.dateKey,
    game: createGame({
      dictionary: PROTOTYPE_DICTIONARY,
      answer: daily.answer.inputKey,
      maxAttempts: DEFAULT_MAX_ATTEMPTS,
    }),
  }
}

function requirePrototypeEntry(inputKey: string): DictionaryEntry {
  const entry = getDictionaryEntry(PROTOTYPE_DICTIONARY, inputKey)

  if (!entry) {
    throw new Error(`La respuesta de prototipo "${inputKey}" no existe.`)
  }

  return entry
}
