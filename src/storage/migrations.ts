export const DAILY_GAME_STORAGE_VERSION = 1 as const
export const STATS_STORAGE_VERSION = 1 as const

export type StoredDailyGame = Readonly<{
  version: typeof DAILY_GAME_STORAGE_VERSION
  dateKey: string
  dictionaryVersion: string
  guesses: readonly string[]
  draft: string
}>

export type StoredStats = Readonly<{
  version: typeof STATS_STORAGE_VERSION
  played: number
  wins: number
  currentStreak: number
  bestStreak: number
  lastCompletedDateKey: string | null
  attemptDistribution: readonly number[]
  recordedDateKeys: readonly string[]
}>

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/u

export function migrateDailyGame(rawValue: string): StoredDailyGame | null {
  let value: unknown

  try {
    value = JSON.parse(rawValue)
  } catch {
    return null
  }

  if (!isRecord(value) || value.version !== DAILY_GAME_STORAGE_VERSION) return null
  if (typeof value.dateKey !== 'string' || !DATE_KEY_PATTERN.test(value.dateKey)) return null
  if (typeof value.dictionaryVersion !== 'string' || value.dictionaryVersion.length === 0) {
    return null
  }
  if (!Array.isArray(value.guesses) || !value.guesses.every((guess) => typeof guess === 'string')) {
    return null
  }
  if (typeof value.draft !== 'string') return null

  return Object.freeze({
    version: DAILY_GAME_STORAGE_VERSION,
    dateKey: value.dateKey,
    dictionaryVersion: value.dictionaryVersion,
    guesses: Object.freeze([...value.guesses]),
    draft: value.draft,
  })
}

export function migrateStats(rawValue: string): StoredStats | null {
  let value: unknown

  try {
    value = JSON.parse(rawValue)
  } catch {
    return null
  }

  if (!isRecord(value) || value.version !== STATS_STORAGE_VERSION) return null
  if (!isNonNegativeInteger(value.played) || !isNonNegativeInteger(value.wins)) return null
  if (!isNonNegativeInteger(value.currentStreak) || !isNonNegativeInteger(value.bestStreak)) {
    return null
  }
  if (value.wins > value.played || value.currentStreak > value.bestStreak) return null
  if (value.bestStreak > value.wins) return null
  if (!isAttemptDistribution(value.attemptDistribution)) {
    return null
  }
  if (!isDateKeyArray(value.recordedDateKeys)) {
    return null
  }
  if (new Set(value.recordedDateKeys).size !== value.recordedDateKeys.length) return null
  if (value.recordedDateKeys.length !== value.played) return null
  if (value.attemptDistribution.reduce((total, count) => total + count, 0) !== value.wins) {
    return null
  }
  const lastCompletedDateKey = value.lastCompletedDateKey
  if (
    lastCompletedDateKey !== null &&
    (typeof lastCompletedDateKey !== 'string' || !isDateKey(lastCompletedDateKey))
  ) {
    return null
  }
  if (value.played === 0 && lastCompletedDateKey !== null) return null
  if (
    value.played > 0 &&
    (lastCompletedDateKey === null || !value.recordedDateKeys.includes(lastCompletedDateKey))
  ) {
    return null
  }

  return Object.freeze({
    version: STATS_STORAGE_VERSION,
    played: value.played,
    wins: value.wins,
    currentStreak: value.currentStreak,
    bestStreak: value.bestStreak,
    lastCompletedDateKey,
    attemptDistribution: Object.freeze([...value.attemptDistribution]),
    recordedDateKeys: Object.freeze([...value.recordedDateKeys]),
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function isAttemptDistribution(value: unknown): value is number[] {
  return Array.isArray(value) && value.length === 10 && value.every(isNonNegativeInteger)
}

function isDateKeyArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((dateKey) => typeof dateKey === 'string' && isDateKey(dateKey))
  )
}

function isDateKey(value: string): boolean {
  if (!DATE_KEY_PATTERN.test(value)) return false

  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
}
