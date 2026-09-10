import dictionaryData from './generated/dictionary-data.json'

import { DAILY_TIME_ZONE, DEFAULT_MAX_ATTEMPTS, WORD_LENGTH } from './constants'
import { selectDailyAnswer } from './daily'
import { createDictionary, getDictionaryEntry } from './dictionary'
import { createGame } from './engine'
import { selectTrainingAnswer } from './training'
import type { RNG } from './training'
import type { DictionaryEntry, GameState } from './types'

const EPOCH_DATE = '2026-01-01'

export const DICTIONARY_VERSION = dictionaryData.version
export const GAME_DICTIONARY = createDictionary(dictionaryData.words, WORD_LENGTH)
export const GAME_ANSWERS = Object.freeze(
  dictionaryData.answers.general.map((key) => requireEntry(key)),
)
export const SENSITIVE_ANSWERS = Object.freeze(
  dictionaryData.answers.sensitive.map((key) => requireEntry(key)),
)
export const RARE_SENSITIVE_ANSWERS = Object.freeze(
  dictionaryData.answers.rareSensitive.map((key) => requireEntry(key)),
)
export const TRAINING_ANSWERS = Object.freeze(
  ['maria', 'papas', 'linda', 'sexto', 'dados', 'kilos', 'fruta', 'jerga', 'fideo', 'palta'].map(
    (key) => requireEntry(key),
  ),
)

export type GameSession = Readonly<{
  dateKey: string
  game: GameState
}>

export type DailyGameSeed = Readonly<{
  answer: string
  dateKey: string
  dictionaryVersion: string
}>

export function createDailyGameSession(seed: DailyGameSeed): GameSession {
  if (seed.dictionaryVersion !== DICTIONARY_VERSION) {
    throw new Error('La palabra diaria no coincide con la versión del diccionario.')
  }

  return {
    dateKey: seed.dateKey,
    game: createGame({
      dictionary: GAME_DICTIONARY,
      answer: seed.answer,
      maxAttempts: DEFAULT_MAX_ATTEMPTS,
    }),
  }
}

export function createGameSession(now: Date = new Date()): GameSession {
  const daily = selectDailyAnswer(
    {
      answers: GAME_ANSWERS,
      sensitiveAnswers: SENSITIVE_ANSWERS,
      rareSensitiveAnswers: RARE_SENSITIVE_ANSWERS,
      sensitiveIntervalDays: dictionaryData.schedule.sensitiveIntervalDays,
      sensitivePhase: dictionaryData.schedule.sensitivePhase,
      rareSensitiveEvery: dictionaryData.schedule.rareSensitiveEvery,
      epochDate: EPOCH_DATE,
      timeZone: DAILY_TIME_ZONE,
    },
    () => now,
  )

  return {
    dateKey: daily.dateKey,
    game: createGame({
      dictionary: GAME_DICTIONARY,
      answer: daily.answer.inputKey,
      maxAttempts: DEFAULT_MAX_ATTEMPTS,
    }),
  }
}

export function createTrainingGame(
  previousAnswerInputKey: string | null,
  rng: RNG = Math.random,
): GameState {
  const answer = selectTrainingAnswer(TRAINING_ANSWERS, previousAnswerInputKey, rng)

  return createGame({
    dictionary: GAME_DICTIONARY,
    answer: answer.inputKey,
    maxAttempts: DEFAULT_MAX_ATTEMPTS,
  })
}

function requireEntry(inputKey: string): DictionaryEntry {
  const entry = getDictionaryEntry(GAME_DICTIONARY, inputKey)

  if (!entry) throw new Error(`La respuesta "${inputKey}" no existe en el diccionario generado.`)
  return entry
}
