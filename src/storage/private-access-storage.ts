import { DICTIONARY_VERSION } from '../game/game-data'
import type { CompletedDailyResult, PrivateDailyPuzzle } from '../private-access/types'
import { getBrowserStorage } from './browser-storage'
import type { StorageAdapter } from './browser-storage'

export const PRIVATE_DAILY_PUZZLE_STORAGE_KEY = 'entrele:private-daily-puzzle:v1'
export const PENDING_DAILY_RESULTS_STORAGE_KEY = 'entrele:pending-daily-results:v1'

type StoredPrivateDailyPuzzle = Readonly<{
  version: 1
  answer: string
  dateKey: string
  dictionaryVersion: string
}>

type StoredPendingDailyResults = Readonly<{
  version: 1
  results: readonly CompletedDailyResult[]
}>

export function loadCachedDailyPuzzle(
  currentDateKey: string,
  storage: StorageAdapter | null = getBrowserStorage(),
): PrivateDailyPuzzle | null {
  if (!storage) return null

  try {
    const rawValue = storage.getItem(PRIVATE_DAILY_PUZZLE_STORAGE_KEY)
    if (!rawValue) return null

    const value: unknown = JSON.parse(rawValue)
    if (!isStoredPrivateDailyPuzzle(value) || value.dateKey !== currentDateKey) {
      storage.removeItem(PRIVATE_DAILY_PUZZLE_STORAGE_KEY)
      return null
    }

    return Object.freeze({
      answer: value.answer,
      dateKey: value.dateKey,
      dictionaryVersion: value.dictionaryVersion,
    })
  } catch {
    storage.removeItem(PRIVATE_DAILY_PUZZLE_STORAGE_KEY)
    return null
  }
}

export function saveCachedDailyPuzzle(
  puzzle: PrivateDailyPuzzle,
  storage: StorageAdapter | null = getBrowserStorage(),
): void {
  if (!storage) return

  const value: StoredPrivateDailyPuzzle = {
    version: 1,
    answer: puzzle.answer,
    dateKey: puzzle.dateKey,
    dictionaryVersion: puzzle.dictionaryVersion,
  }

  try {
    storage.setItem(PRIVATE_DAILY_PUZZLE_STORAGE_KEY, JSON.stringify(value))
  } catch {
    // La partida sigue disponible mientras esta pestaña permanezca abierta.
  }
}

export function loadPendingDailyResults(
  storage: StorageAdapter | null = getBrowserStorage(),
): readonly CompletedDailyResult[] {
  if (!storage) return []

  try {
    const rawValue = storage.getItem(PENDING_DAILY_RESULTS_STORAGE_KEY)
    if (!rawValue) return []

    const value: unknown = JSON.parse(rawValue)
    if (!isStoredPendingDailyResults(value)) {
      storage.removeItem(PENDING_DAILY_RESULTS_STORAGE_KEY)
      return []
    }

    return Object.freeze(value.results.map((result) => Object.freeze({ ...result })))
  } catch {
    storage.removeItem(PENDING_DAILY_RESULTS_STORAGE_KEY)
    return []
  }
}

export function queuePendingDailyResult(
  result: CompletedDailyResult,
  storage: StorageAdapter | null = getBrowserStorage(),
): void {
  if (!storage) return

  const current = loadPendingDailyResults(storage)
  if (current.some((storedResult) => storedResult.dateKey === result.dateKey)) return

  savePendingDailyResults([...current, result], storage)
}

export function removePendingDailyResult(
  dateKey: string,
  storage: StorageAdapter | null = getBrowserStorage(),
): void {
  if (!storage) return

  const current = loadPendingDailyResults(storage)
  savePendingDailyResults(
    current.filter((result) => result.dateKey !== dateKey),
    storage,
  )
}

function savePendingDailyResults(
  results: readonly CompletedDailyResult[],
  storage: StorageAdapter,
): void {
  try {
    const value: StoredPendingDailyResults = { version: 1, results }
    storage.setItem(PENDING_DAILY_RESULTS_STORAGE_KEY, JSON.stringify(value))
  } catch {
    // El resultado permanece en las estadísticas locales si el navegador bloquea el guardado.
  }
}

function isStoredPrivateDailyPuzzle(value: unknown): value is StoredPrivateDailyPuzzle {
  return (
    isRecord(value) &&
    value.version === 1 &&
    typeof value.answer === 'string' &&
    /^[a-zñ]{5}$/u.test(value.answer) &&
    typeof value.dateKey === 'string' &&
    isDateKey(value.dateKey) &&
    value.dictionaryVersion === DICTIONARY_VERSION
  )
}

function isStoredPendingDailyResults(value: unknown): value is StoredPendingDailyResults {
  return (
    isRecord(value) &&
    value.version === 1 &&
    Array.isArray(value.results) &&
    value.results.length <= 31 &&
    value.results.every(isCompletedDailyResult) &&
    new Set(value.results.map((result) => result.dateKey)).size === value.results.length
  )
}

function isCompletedDailyResult(value: unknown): value is CompletedDailyResult {
  return (
    isRecord(value) &&
    typeof value.dateKey === 'string' &&
    isDateKey(value.dateKey) &&
    (value.status === 'won' || value.status === 'lost') &&
    typeof value.attemptsUsed === 'number' &&
    Number.isInteger(value.attemptsUsed) &&
    value.attemptsUsed >= 1 &&
    value.attemptsUsed <= 10
  )
}

function isDateKey(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false

  const timestamp = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
