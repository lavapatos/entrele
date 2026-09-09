import { describe, expect, it } from 'vitest'

import { createEmptyStats, expireStreak, getWinRate, recordDailyResult } from './stats'

describe('daily stats', () => {
  it('registra una fecha una sola vez y distribuye solo las victorias', () => {
    const first = recordDailyResult(createEmptyStats(), {
      dateKey: '2026-09-01',
      status: 'won',
      attemptsUsed: 3,
    })
    const duplicate = recordDailyResult(first, {
      dateKey: '2026-09-01',
      status: 'lost',
      attemptsUsed: 10,
    })

    expect(duplicate).toBe(first)
    expect(first.played).toBe(1)
    expect(first.wins).toBe(1)
    expect(first.attemptDistribution[2]).toBe(1)
    expect(getWinRate(first)).toBe(100)
  })

  it('mantiene una racha diaria y la reinicia al perder', () => {
    const first = recordDailyResult(createEmptyStats(), {
      dateKey: '2026-09-01',
      status: 'won',
      attemptsUsed: 3,
    })
    const second = recordDailyResult(first, {
      dateKey: '2026-09-02',
      status: 'won',
      attemptsUsed: 2,
    })
    const loss = recordDailyResult(second, {
      dateKey: '2026-09-03',
      status: 'lost',
      attemptsUsed: 10,
    })

    expect(second.currentStreak).toBe(2)
    expect(second.bestStreak).toBe(2)
    expect(loss.currentStreak).toBe(0)
    expect(loss.bestStreak).toBe(2)
    expect(getWinRate(loss)).toBe(67)
  })

  it('vence una racha cuando se salta un día', () => {
    const stats = recordDailyResult(createEmptyStats(), {
      dateKey: '2026-09-01',
      status: 'won',
      attemptsUsed: 1,
    })

    expect(expireStreak(stats, '2026-09-02').currentStreak).toBe(1)
    expect(expireStreak(stats, '2026-09-03').currentStreak).toBe(0)
  })
})
