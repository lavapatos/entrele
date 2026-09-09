import { describe, expect, it } from 'vitest'

import { createTrainingGame, TRAINING_ANSWERS } from './game-data'
import { selectTrainingAnswer } from './training'

describe('training mode', () => {
  it('usa únicamente respuestas válidas del diccionario', () => {
    expect(TRAINING_ANSWERS).toHaveLength(10)

    for (const answer of TRAINING_ANSWERS) {
      expect(answer.inputKey).toHaveLength(5)
    }
  })

  it('permite inyectar el azar y evita repetir la respuesta anterior', () => {
    const first = selectTrainingAnswer(TRAINING_ANSWERS, null, () => 0)
    const second = selectTrainingAnswer(TRAINING_ANSWERS, first.inputKey, () => 0)

    expect(first.inputKey).toBe('maria')
    expect(second.inputKey).not.toBe(first.inputKey)
  })

  it('crea una partida nueva con las mismas reglas', () => {
    const game = createTrainingGame(null, () => 0)

    expect(game.answer.inputKey).toBe('maria')
    expect(game.maxAttempts).toBe(10)
    expect(game.status).toBe('playing')
  })
})
