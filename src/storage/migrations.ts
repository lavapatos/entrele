export const DAILY_GAME_STORAGE_VERSION = 1 as const

export type StoredDailyGame = Readonly<{
  version: typeof DAILY_GAME_STORAGE_VERSION
  dateKey: string
  dictionaryVersion: string
  guesses: readonly string[]
  draft: string
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
