import { beforeEach, describe, expect, it } from 'vitest'

import { createEmptyStats, recordDailyResult } from '../game/stats'
import { loadStats, saveStats, STATS_STORAGE_KEY } from './stats-storage'

describe('stats storage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('guarda y recupera estadísticas versionadas', () => {
    const stats = recordDailyResult(createEmptyStats(), {
      dateKey: '2026-09-01',
      status: 'won',
      attemptsUsed: 4,
    })

    saveStats(stats)

    expect(loadStats()).toEqual(stats)
    expect(JSON.parse(window.localStorage.getItem(STATS_STORAGE_KEY) ?? '').version).toBe(1)
  })

  it('descarta estadísticas corruptas', () => {
    window.localStorage.setItem(STATS_STORAGE_KEY, '{no-es-json')

    expect(loadStats()).toEqual(createEmptyStats())
    expect(window.localStorage.getItem(STATS_STORAGE_KEY)).toBeNull()
  })
})
