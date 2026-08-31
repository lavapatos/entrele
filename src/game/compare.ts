import type { GuessRelation } from './types'

export function compareRanks(guessRank: number, answerRank: number): GuessRelation {
  if (guessRank === answerRank) {
    return 'equal'
  }

  return guessRank < answerRank ? 'before' : 'after'
}

export function countWordsBetween(firstRank: number, secondRank: number): number {
  return Math.max(0, Math.abs(firstRank - secondRank) - 1)
}
