import type { GuessRelation } from './types'

export function compareRanks(guessRank: number, answerRank: number): GuessRelation {
  if (guessRank === answerRank) {
    return 'equal'
  }

  return guessRank < answerRank ? 'before' : 'after'
}

export function getRankDistance(firstRank: number, secondRank: number): number {
  return Math.abs(firstRank - secondRank)
}

export function getDistancePercent(rankDistance: number, dictionarySize: number): number {
  if (dictionarySize <= 1) {
    return 0
  }

  return (rankDistance / (dictionarySize - 1)) * 100
}
