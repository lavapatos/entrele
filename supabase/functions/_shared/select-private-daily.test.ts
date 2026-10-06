import { describe, expect, it } from 'vitest'

import { PRIVATE_DAILY_DATA } from './daily-data'
import { selectPrivateDaily } from './select-private-daily'

const DATA = {
  version: 'test-v1',
  epochDate: '2026-01-01',
  shuffleStartDate: '2026-10-07',
  timeZone: 'America/Santiago',
  answers: {
    general: ['abeja', 'mango', 'radio'],
    sensitive: ['jerga'],
    rareSensitive: ['papas'],
  },
  schedule: {
    sensitiveIntervalDays: 4,
    sensitivePhase: 0,
    rareSensitiveEvery: 2,
  },
} as const

const SEED = '0123456789abcdef0123456789abcdef'
const SHUFFLED_SEED = 'abcdef0123456789abcdef0123456789'

describe('private daily selector', () => {
  it('produce la misma respuesta para una misma fecha y semilla', async () => {
    const now = new Date('2026-01-02T12:00:00Z')

    await expect(selectPrivateDaily(DATA, SEED, now)).resolves.toEqual(
      await selectPrivateDaily(DATA, SEED, now),
    )
  })

  it('dispersa las iniciales y usa cada respuesta general una vez por ciclo', async () => {
    const generalAnswers = new Set(PRIVATE_DAILY_DATA.answers.general)
    const selectedGeneralAnswers: string[] = []
    const completeSequence: string[] = []
    const date = new Date('2026-10-07T12:00:00Z')

    for (let day = 0; selectedGeneralAnswers.length < generalAnswers.size; day += 1) {
      date.setUTCDate(date.getUTCDate() + (day === 0 ? 0 : 1))
      const puzzle = await selectPrivateDaily(PRIVATE_DAILY_DATA, SHUFFLED_SEED, date)

      completeSequence.push(puzzle.answer)
      if (generalAnswers.has(puzzle.answer)) selectedGeneralAnswers.push(puzzle.answer)
    }

    expect(new Set(selectedGeneralAnswers).size).toBe(generalAnswers.size)
    expect(getLongestInitialRun(selectedGeneralAnswers)).toBe(1)
    expect(getLongestInitialRun(completeSequence)).toBeLessThanOrEqual(2)
  })

  it('conserva el último día antiguo y corta la racha al activar el nuevo orden', async () => {
    const previous = await selectPrivateDaily(
      PRIVATE_DAILY_DATA,
      SHUFFLED_SEED,
      new Date('2026-10-06T12:00:00Z'),
    )
    const firstShuffled = await selectPrivateDaily(
      PRIVATE_DAILY_DATA,
      SHUFFLED_SEED,
      new Date('2026-10-07T12:00:00Z'),
    )

    expect(previous.answer).toBe('huevo')
    expect(firstShuffled.answer[0]).not.toBe(previous.answer[0])
    await expect(
      selectPrivateDaily(PRIVATE_DAILY_DATA, SHUFFLED_SEED, new Date('2026-10-07T12:00:00Z')),
    ).resolves.toEqual(firstShuffled)
  })

  it('mantiene el calendario de respuestas sensibles después del corte', async () => {
    const rareSensitive = await selectPrivateDaily(
      PRIVATE_DAILY_DATA,
      SHUFFLED_SEED,
      new Date('2026-10-21T12:00:00Z'),
    )
    const sensitive = await selectPrivateDaily(
      PRIVATE_DAILY_DATA,
      SHUFFLED_SEED,
      new Date('2026-12-24T12:00:00Z'),
    )

    expect(PRIVATE_DAILY_DATA.answers.rareSensitive).toContain(rareSensitive.answer)
    expect(PRIVATE_DAILY_DATA.answers.sensitive).toContain(sensitive.answer)
  })

  it('respeta la fecha civil de Santiago', async () => {
    await expect(
      selectPrivateDaily(DATA, SEED, new Date('2026-01-01T02:30:00Z')),
    ).resolves.toMatchObject({ dateKey: '2025-12-31' })
  })

  it('conserva la rotación de respuestas sensibles', async () => {
    await expect(
      selectPrivateDaily(DATA, SEED, new Date('2026-01-01T12:00:00Z')),
    ).resolves.toMatchObject({ answer: 'papas' })
    await expect(
      selectPrivateDaily(DATA, SEED, new Date('2026-01-05T12:00:00Z')),
    ).resolves.toMatchObject({ answer: 'jerga' })
  })

  it('rechaza una semilla demasiado corta', async () => {
    await expect(selectPrivateDaily(DATA, 'corta')).rejects.toThrow('semilla diaria')
  })
})

function getLongestInitialRun(words: readonly string[]): number {
  let longest = 0
  let current = 0
  let previousInitial = ''

  for (const word of words) {
    const initial = word[0] ?? ''
    current = initial === previousInitial ? current + 1 : 1
    previousInitial = initial
    longest = Math.max(longest, current)
  }

  return longest
}
