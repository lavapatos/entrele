import { getDistancePercent } from './compare'
import { countLetters, normalizeInput } from './normalize'
import type {
  GameResult,
  GameState,
  Guess,
  RangeBound,
  RangeProximity,
  RemainingRange,
} from './types'

const SPANISH_ALPHABET = [...'abcdefghijklmnñopqrstuvwxyz'] as const
const LETTER_ORDER = new Map(SPANISH_ALPHABET.map((letter, index) => [letter, index]))

export function getRemainingRange(state: GameState): RemainingRange {
  return {
    lower: createBound(state, state.lowerBoundRank, 'start'),
    upper: createBound(state, state.upperBoundRank, 'end'),
    candidateCount:
      state.status === 'won' ? 0 : Math.max(0, state.upperBoundRank - state.lowerBoundRank - 1),
  }
}

export function getAttemptsUsed(state: GameState): number {
  return state.guesses.length
}

export function getAttemptsRemaining(state: GameState): number {
  return Math.max(0, state.maxAttempts - getAttemptsUsed(state))
}

export function getAllowedNextLetters(state: GameState, rawPrefix: string): readonly string[] {
  if (state.status !== 'playing') return []

  const prefix = normalizePrefix(rawPrefix)

  if (prefix === null) return SPANISH_ALPHABET

  const prefixLength = countLetters(prefix)

  if (prefixLength >= state.dictionary.wordLength) return []

  const lowerBound = state.dictionary.entries[state.lowerBoundRank]?.inputKey ?? null
  const upperBound = state.dictionary.entries[state.upperBoundRank]?.inputKey ?? null
  const suffixLength = state.dictionary.wordLength - prefixLength - 1
  const firstSuffix = 'a'.repeat(suffixLength)
  const lastSuffix = 'z'.repeat(suffixLength)

  return SPANISH_ALPHABET.filter((letter) => {
    const firstPossibleWord = `${prefix}${letter}${firstSuffix}`
    const lastPossibleWord = `${prefix}${letter}${lastSuffix}`
    const fallsAfterLowerBound =
      lowerBound === null || compareInputKeys(lastPossibleWord, lowerBound) > 0
    const fallsBeforeUpperBound =
      upperBound === null || compareInputKeys(firstPossibleWord, upperBound) < 0

    return fallsAfterLowerBound && fallsBeforeUpperBound
  })
}

export function getLastGuess(state: GameState): Guess | null {
  return state.guesses.at(-1) ?? null
}

export function getRangeProximity(state: GameState): RangeProximity {
  const lastGuess = getLastGuess(state)

  if (!lastGuess) {
    return { lastGuessDistancePercent: null, closerBound: null }
  }

  const lastGuessDistancePercent = getDistancePercent(
    lastGuess.rankDistance,
    state.dictionary.entries.length,
  )

  if (lastGuess.relation === 'equal') {
    return { lastGuessDistancePercent, closerBound: null }
  }

  const lowerDistance = state.answer.sortRank - state.lowerBoundRank
  const upperDistance = state.upperBoundRank - state.answer.sortRank
  const closerBound =
    lowerDistance === upperDistance ? 'tie' : lowerDistance < upperDistance ? 'lower' : 'upper'

  return { lastGuessDistancePercent, closerBound }
}

export function getGameResult(state: GameState): GameResult {
  return {
    status: state.status,
    attemptsUsed: getAttemptsUsed(state),
    attemptsRemaining: getAttemptsRemaining(state),
    answer: state.status === 'playing' ? null : state.answer.display,
  }
}

function createBound(state: GameState, rank: number, sentinelKind: 'start' | 'end'): RangeBound {
  const entry = state.dictionary.entries[rank]

  if (entry) {
    return { kind: 'word', display: entry.display, rank }
  }

  return {
    kind: sentinelKind,
    display: sentinelKind === 'start' ? 'A…' : '…Z',
    rank,
  }
}

function normalizePrefix(rawPrefix: string): string | null {
  if (rawPrefix.length === 0) return ''

  const normalized = normalizeInput(rawPrefix)
  return normalized.ok ? normalized.inputKey : null
}

function compareInputKeys(left: string, right: string): number {
  const leftLetters = [...left]
  const rightLetters = [...right]
  const length = Math.min(leftLetters.length, rightLetters.length)

  for (let index = 0; index < length; index += 1) {
    const leftOrder = LETTER_ORDER.get(leftLetters[index] ?? '')
    const rightOrder = LETTER_ORDER.get(rightLetters[index] ?? '')

    if (leftOrder === undefined || rightOrder === undefined) return 0
    if (leftOrder !== rightOrder) return leftOrder - rightOrder
  }

  return leftLetters.length - rightLetters.length
}
