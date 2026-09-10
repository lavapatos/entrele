import { beforeEach, describe, expect, it } from 'vitest'

import { DICTIONARY_VERSION } from '../game/game-data'
import {
  loadCachedDailyPuzzle,
  loadPendingDailyResults,
  PENDING_DAILY_RESULTS_STORAGE_KEY,
  PRIVATE_DAILY_PUZZLE_STORAGE_KEY,
  queuePendingDailyResult,
  removePendingDailyResult,
  saveCachedDailyPuzzle,
} from './private-access-storage'

describe('private access storage', () => {
  beforeEach(() => window.localStorage.clear())

  it('conserva únicamente la palabra privada del día vigente', () => {
    saveCachedDailyPuzzle({
      answer: 'salto',
      dateKey: '2026-09-10',
      dictionaryVersion: DICTIONARY_VERSION,
    })

    expect(loadCachedDailyPuzzle('2026-09-10')).toEqual({
      answer: 'salto',
      dateKey: '2026-09-10',
      dictionaryVersion: DICTIONARY_VERSION,
    })
    expect(loadCachedDailyPuzzle('2026-09-11')).toBeNull()
    expect(window.localStorage.getItem(PRIVATE_DAILY_PUZZLE_STORAGE_KEY)).toBeNull()
  })

  it('retiene un resultado pendiente hasta que se sincroniza', () => {
    const result = { dateKey: '2026-09-10', status: 'won' as const, attemptsUsed: 3 }

    queuePendingDailyResult(result)
    queuePendingDailyResult(result)
    expect(loadPendingDailyResults()).toEqual([result])

    removePendingDailyResult(result.dateKey)
    expect(loadPendingDailyResults()).toEqual([])
    expect(
      JSON.parse(window.localStorage.getItem(PENDING_DAILY_RESULTS_STORAGE_KEY) ?? ''),
    ).toEqual({ version: 1, results: [] })
  })

  it('descarta datos privados corruptos', () => {
    window.localStorage.setItem(PRIVATE_DAILY_PUZZLE_STORAGE_KEY, '{')
    window.localStorage.setItem(PENDING_DAILY_RESULTS_STORAGE_KEY, '{')

    expect(loadCachedDailyPuzzle('2026-09-10')).toBeNull()
    expect(loadPendingDailyResults()).toEqual([])
  })
})
