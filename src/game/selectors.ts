import { getDistancePercent } from './compare'
import type {
  GameResult,
  GameState,
  Guess,
  RangeBound,
  RangeProximity,
  RemainingRange,
} from './types'

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
