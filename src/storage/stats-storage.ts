import { createEmptyStats } from '../game/stats'
import type { GameStats } from '../game/stats'
import { getBrowserStorage } from './browser-storage'
import type { StorageAdapter } from './browser-storage'
import { migrateStats, STATS_STORAGE_VERSION } from './migrations'

export const STATS_STORAGE_KEY = 'entrele:stats:v1'

export function loadStats(storage: StorageAdapter | null = getBrowserStorage()): GameStats {
  if (!storage) return createEmptyStats()

  try {
    const rawValue = storage.getItem(STATS_STORAGE_KEY)
    if (!rawValue) return createEmptyStats()

    const stored = migrateStats(rawValue)
    if (!stored) {
      storage.removeItem(STATS_STORAGE_KEY)
      return createEmptyStats()
    }

    return Object.freeze({
      played: stored.played,
      wins: stored.wins,
      currentStreak: stored.currentStreak,
      bestStreak: stored.bestStreak,
      lastCompletedDateKey: stored.lastCompletedDateKey,
      attemptDistribution: stored.attemptDistribution,
      recordedDateKeys: stored.recordedDateKeys,
    })
  } catch {
    return createEmptyStats()
  }
}

export function saveStats(
  stats: GameStats,
  storage: StorageAdapter | null = getBrowserStorage(),
): void {
  if (!storage) return

  try {
    storage.setItem(
      STATS_STORAGE_KEY,
      JSON.stringify({
        version: STATS_STORAGE_VERSION,
        ...stats,
      }),
    )
  } catch {
    // La partida sigue funcionando aunque el navegador no permita persistencia.
  }
}
