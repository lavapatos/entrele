import { compareRanks, countWordsBetween } from './compare'
import { DEFAULT_MAX_ATTEMPTS } from './constants'
import { getDictionaryEntry } from './dictionary'
import { countLetters, normalizeInput } from './normalize'
import type { GameConfig, GameState, Guess, SubmitGuessResult } from './types'

export function createGame(config: GameConfig): GameState {
  const maxAttempts = config.maxAttempts ?? DEFAULT_MAX_ATTEMPTS

  if (!Number.isInteger(maxAttempts) || maxAttempts <= 0) {
    throw new Error('La cantidad máxima de intentos debe ser un entero positivo.')
  }

  const normalizedAnswer = normalizeInput(config.answer)

  if (!normalizedAnswer.ok) {
    throw new Error('La respuesta debe existir en el diccionario.')
  }

  const answer = getDictionaryEntry(config.dictionary, normalizedAnswer.inputKey)

  if (!answer) {
    throw new Error('La respuesta debe existir en el diccionario.')
  }

  return Object.freeze({
    dictionary: config.dictionary,
    answer,
    guesses: Object.freeze([]),
    lowerBoundRank: -1,
    upperBoundRank: config.dictionary.entries.length,
    maxAttempts,
    status: 'playing',
  })
}

export function submitGuess(state: GameState, rawGuess: string): SubmitGuessResult {
  if (state.status !== 'playing') {
    return reject(state, 'game-over')
  }

  const normalizedGuess = normalizeInput(rawGuess)

  if (!normalizedGuess.ok) {
    return reject(state, normalizedGuess.reason)
  }

  if (countLetters(normalizedGuess.inputKey) !== state.dictionary.wordLength) {
    return reject(state, 'wrong-length')
  }

  const entry = getDictionaryEntry(state.dictionary, normalizedGuess.inputKey)

  if (!entry) {
    return reject(state, 'unknown-word')
  }

  if (state.guesses.some((guess) => guess.rank === entry.sortRank)) {
    return reject(state, 'duplicate')
  }

  if (entry.sortRank <= state.lowerBoundRank || entry.sortRank >= state.upperBoundRank) {
    return reject(state, 'outside-range')
  }

  const relation = compareRanks(entry.sortRank, state.answer.sortRank)
  const guess: Guess = Object.freeze({
    raw: rawGuess,
    display: entry.display,
    inputKey: entry.inputKey,
    rank: entry.sortRank,
    relation,
    wordsBetweenAnswer: countWordsBetween(entry.sortRank, state.answer.sortRank),
  })
  const guesses = Object.freeze([...state.guesses, guess])
  const lowerBoundRank = relation === 'before' ? entry.sortRank : state.lowerBoundRank
  const upperBoundRank = relation === 'after' ? entry.sortRank : state.upperBoundRank
  const status =
    relation === 'equal' ? 'won' : guesses.length >= state.maxAttempts ? 'lost' : 'playing'
  const nextState: GameState = Object.freeze({
    ...state,
    guesses,
    lowerBoundRank,
    upperBoundRank,
    status,
  })

  return Object.freeze({ accepted: true, state: nextState, guess })
}

function reject(
  state: GameState,
  reason: Extract<SubmitGuessResult, { accepted: false }>['reason'],
): SubmitGuessResult {
  return Object.freeze({ accepted: false, state, reason })
}
