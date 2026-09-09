import { beforeEach, describe, expect, it } from 'vitest'

import { submitGuess } from '../game/engine'
import { DICTIONARY_VERSION, createGameSession } from '../game/game-data'
import { DAILY_GAME_STORAGE_KEY, loadDailyGame, saveDailyGame } from './game-storage'

describe('game storage', () => {
  const prototypeDate = new Date('2026-01-01T12:00:00Z')

  beforeEach(() => {
    window.localStorage.clear()
  })

  it('guarda solo los datos mínimos y reconstruye la partida', () => {
    const session = createGameSession(prototypeDate)
    const submission = submitGuess(session.game, 'radio')
    if (!submission.accepted) throw new Error('Falta el intento necesario para la prueba.')

    saveDailyGame({
      dateKey: session.dateKey,
      game: submission.state,
      draft: 'ma',
    })

    expect(JSON.parse(window.localStorage.getItem(DAILY_GAME_STORAGE_KEY) ?? '')).toEqual({
      version: 1,
      dateKey: session.dateKey,
      dictionaryVersion: DICTIONARY_VERSION,
      guesses: ['radio'],
      draft: 'ma',
    })

    const restored = loadDailyGame(createGameSession(prototypeDate))
    expect(restored.game.guesses.map((guess) => guess.inputKey)).toEqual(['radio'])
    expect(restored.game.upperBoundRank).toBe(submission.state.upperBoundRank)
    expect(restored.draft).toBe('ma')
  })

  it('descarta partidas de otro día', () => {
    const previousSession = createGameSession(prototypeDate)
    saveDailyGame({ dateKey: previousSession.dateKey, game: previousSession.game, draft: 'ma' })

    const nextDate = new Date('2026-01-02T12:00:00Z')
    const restored = loadDailyGame(createGameSession(nextDate))

    expect(restored.game.guesses).toHaveLength(0)
    expect(restored.draft).toBe('')
    expect(window.localStorage.getItem(DAILY_GAME_STORAGE_KEY)).toBeNull()
  })

  it('ignora datos corruptos sin impedir una partida nueva', () => {
    window.localStorage.setItem(DAILY_GAME_STORAGE_KEY, '{no-es-json')

    const restored = loadDailyGame(createGameSession(prototypeDate))

    expect(restored.game.guesses).toHaveLength(0)
    expect(restored.draft).toBe('')
    expect(window.localStorage.getItem(DAILY_GAME_STORAGE_KEY)).toBeNull()
  })
})
