import { describe, expect, it } from 'vitest'

import {
  createSupabasePrivateGameGateway,
  parseDailyPuzzle,
  parseDailyResultRow,
  usernameToAuthEmail,
} from './supabase-gateway'
import { PrivateAccessError } from './types'

describe('Supabase private game gateway', () => {
  it('deja disponible el modo público cuando Supabase no está configurado', () => {
    expect(createSupabasePrivateGameGateway({})).toBeNull()
  })

  it('convierte el usuario visible en un identificador interno sintético', () => {
    expect(usernameToAuthEmail(' USUARIO_PRUEBA ')).toBe('usuario_prueba@entrele.example.com')
  })

  it('valida una palabra diaria compatible con el diccionario local', () => {
    expect(
      parseDailyPuzzle(
        {
          answer: 'salto',
          dateKey: '2026-09-10',
          dictionaryVersion: 'dictionary-v1',
        },
        'dictionary-v1',
      ),
    ).toEqual({
      answer: 'salto',
      dateKey: '2026-09-10',
      dictionaryVersion: 'dictionary-v1',
    })
  })

  it('rechaza una palabra creada con otra versión del diccionario', () => {
    try {
      parseDailyPuzzle(
        {
          answer: 'salto',
          dateKey: '2026-09-10',
          dictionaryVersion: 'old-version',
        },
        'current-version',
      )
      throw new Error('Se esperaba un error de versión.')
    } catch (error) {
      expect(error).toBeInstanceOf(PrivateAccessError)
      expect((error as PrivateAccessError).reason).toBe('dictionary-mismatch')
    }
  })

  it('convierte una fila terminada sin exponer palabras ni intentos', () => {
    expect(
      parseDailyResultRow({
        puzzle_date: '2026-09-10',
        won: true,
        attempts: 4,
        completed_at: '2026-09-10T15:30:00.000Z',
      }),
    ).toEqual({
      dateKey: '2026-09-10',
      status: 'won',
      attemptsUsed: 4,
      completedAt: '2026-09-10T15:30:00.000Z',
    })
  })
})
