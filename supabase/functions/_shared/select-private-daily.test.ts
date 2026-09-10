import { describe, expect, it } from 'vitest'

import { selectPrivateDaily } from './select-private-daily'

const DATA = {
  version: 'test-v1',
  epochDate: '2026-01-01',
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

describe('private daily selector', () => {
  it('produce la misma respuesta para una misma fecha y semilla', async () => {
    const now = new Date('2026-01-02T12:00:00Z')

    await expect(selectPrivateDaily(DATA, SEED, now)).resolves.toEqual(
      await selectPrivateDaily(DATA, SEED, now),
    )
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
