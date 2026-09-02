import { describe, expect, it } from 'vitest'

import { DAILY_TIME_ZONE } from './constants'
import { getDateKey, getDayOffset, selectDailyAnswer } from './daily'
import { PROTOTYPE_ANSWERS } from './prototype-data'

describe('respuesta diaria', () => {
  it('usa explícitamente el cambio de día de America/Santiago en verano', () => {
    expect(getDateKey(new Date('2026-01-15T02:59:59Z'), DAILY_TIME_ZONE)).toBe('2026-01-14')
    expect(getDateKey(new Date('2026-01-15T03:00:00Z'), DAILY_TIME_ZONE)).toBe('2026-01-15')
  })

  it('respeta el cambio de offset de America/Santiago en invierno', () => {
    expect(getDateKey(new Date('2026-06-15T03:59:59Z'), DAILY_TIME_ZONE)).toBe('2026-06-14')
    expect(getDateKey(new Date('2026-06-15T04:00:00Z'), DAILY_TIME_ZONE)).toBe('2026-06-15')
  })

  it('selecciona de forma determinista y cicla la lista de respuestas', () => {
    const config = {
      answers: PROTOTYPE_ANSWERS.slice(0, 3),
      epochDate: '2026-01-01',
      timeZone: DAILY_TIME_ZONE,
    }

    expect(selectDailyAnswer(config, () => new Date('2026-01-01T12:00:00Z'))).toMatchObject({
      answer: { display: 'mango' },
      dateKey: '2026-01-01',
      dayOffset: 0,
    })
    expect(selectDailyAnswer(config, () => new Date('2026-01-04T12:00:00Z'))).toMatchObject({
      answer: { display: 'mango' },
      dateKey: '2026-01-04',
      dayOffset: 3,
    })
    expect(selectDailyAnswer(config, () => new Date('2025-12-31T12:00:00Z'))).toMatchObject({
      answer: { display: 'abeja' },
      dayOffset: -1,
    })
  })

  it('calcula días civiles sin contaminarse por DST', () => {
    expect(getDayOffset('2026-09-07', '2026-09-05')).toBe(2)
    expect(() => getDayOffset('2026-02-30', '2026-01-01')).toThrow(
      'La fecha civil "2026-02-30" no existe.',
    )
  })

  it('reserva 1 de cada 64 días para respuestas sensibles y hace las obvias aún más raras', () => {
    const config = {
      answers: PROTOTYPE_ANSWERS.slice(0, 3),
      sensitiveAnswers: PROTOTYPE_ANSWERS.slice(3, 5),
      rareSensitiveAnswers: PROTOTYPE_ANSWERS.slice(5, 7),
      sensitiveIntervalDays: 64,
      sensitivePhase: 1,
      rareSensitiveEvery: 4,
      epochDate: '2026-01-01',
      timeZone: DAILY_TIME_ZONE,
    }

    expect(selectDailyAnswer(config, () => new Date('2026-01-02T12:00:00Z')).pool).toBe(
      'rare-sensitive',
    )
    expect(selectDailyAnswer(config, () => new Date('2026-03-07T12:00:00Z')).pool).toBe('sensitive')
    expect(selectDailyAnswer(config, () => new Date('2026-01-03T12:00:00Z')).pool).toBe('general')
  })
})
