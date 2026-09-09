import { DEFAULT_MAX_ATTEMPTS } from './constants'
import type { GameStatus } from './types'

export type GameStats = Readonly<{
  played: number
  wins: number
  currentStreak: number
  bestStreak: number
  lastCompletedDateKey: string | null
  attemptDistribution: readonly number[]
  recordedDateKeys: readonly string[]
}>

type DailyResult = Readonly<{
  dateKey: string
  status: Exclude<GameStatus, 'playing'>
  attemptsUsed: number
}>

export function createEmptyStats(): GameStats {
  return freezeStats({
    played: 0,
    wins: 0,
    currentStreak: 0,
    bestStreak: 0,
    lastCompletedDateKey: null,
    attemptDistribution: Array.from({ length: DEFAULT_MAX_ATTEMPTS }, () => 0),
    recordedDateKeys: [],
  })
}

export function recordDailyResult(stats: GameStats, result: DailyResult): GameStats {
  if (stats.recordedDateKeys.includes(result.dateKey)) return stats
  if (result.attemptsUsed < 1 || result.attemptsUsed > stats.attemptDistribution.length) {
    throw new Error('La cantidad de intentos no corresponde a la distribución.')
  }

  const current = expireStreak(stats, result.dateKey)
  const won = result.status === 'won'
  const isConsecutiveWin =
    won &&
    current.currentStreak > 0 &&
    current.lastCompletedDateKey !== null &&
    getDayDifference(current.lastCompletedDateKey, result.dateKey) === 1
  const currentStreak = won ? (isConsecutiveWin ? current.currentStreak + 1 : 1) : 0
  const attemptDistribution = [...current.attemptDistribution]

  if (won) {
    const attemptIndex = result.attemptsUsed - 1
    attemptDistribution[attemptIndex] = (attemptDistribution[attemptIndex] ?? 0) + 1
  }

  return freezeStats({
    played: current.played + 1,
    wins: current.wins + (won ? 1 : 0),
    currentStreak,
    bestStreak: Math.max(current.bestStreak, currentStreak),
    lastCompletedDateKey: result.dateKey,
    attemptDistribution,
    recordedDateKeys: [...current.recordedDateKeys, result.dateKey],
  })
}

export function expireStreak(stats: GameStats, currentDateKey: string): GameStats {
  if (
    stats.currentStreak === 0 ||
    stats.lastCompletedDateKey === null ||
    getDayDifference(stats.lastCompletedDateKey, currentDateKey) <= 1
  ) {
    return stats
  }

  return freezeStats({ ...stats, currentStreak: 0 })
}

export function getWinRate(stats: GameStats): number {
  return stats.played === 0 ? 0 : Math.round((stats.wins / stats.played) * 100)
}

function getDayDifference(earlierDateKey: string, laterDateKey: string): number {
  return (getDayNumber(laterDateKey) - getDayNumber(earlierDateKey)) / 86_400_000
}

function getDayNumber(dateKey: string): number {
  const timestamp = Date.parse(`${dateKey}T00:00:00Z`)
  if (!Number.isFinite(timestamp)) throw new Error(`Fecha diaria inválida: "${dateKey}".`)
  return timestamp
}

function freezeStats(stats: GameStats): GameStats {
  return Object.freeze({
    ...stats,
    attemptDistribution: Object.freeze([...stats.attemptDistribution]),
    recordedDateKeys: Object.freeze([...stats.recordedDateKeys]),
  })
}
