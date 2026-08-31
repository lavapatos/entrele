import { describe, expect, it } from 'vitest'

import { createGame, submitGuess } from './engine'
import { PROTOTYPE_DICTIONARY } from './prototype-data'
import { getAttemptsRemaining, getGameResult, getRemainingRange } from './selectors'
import type { GameState, GuessRejectionReason, SubmitGuessResult } from './types'

function createMangoGame(maxAttempts = 10): GameState {
  return createGame({
    dictionary: PROTOTYPE_DICTIONARY,
    answer: 'mango',
    maxAttempts,
  })
}

function expectAccepted(result: SubmitGuessResult): Extract<SubmitGuessResult, { accepted: true }> {
  expect(result.accepted).toBe(true)

  if (!result.accepted) {
    throw new Error(`Se esperaba un intento aceptado, pero fue ${result.reason}.`)
  }

  return result
}

function expectRejected(
  result: SubmitGuessResult,
  reason: GuessRejectionReason,
): Extract<SubmitGuessResult, { accepted: false }> {
  expect(result).toMatchObject({ accepted: false, reason })

  if (result.accepted) {
    throw new Error(`Se esperaba rechazo ${reason}, pero el intento fue aceptado.`)
  }

  return result
}

describe('motor de ENTRELE', () => {
  it('comienza con todo el diccionario entre límites abstractos', () => {
    const state = createMangoGame()
    const range = getRemainingRange(state)

    expect(range).toEqual({
      lower: { kind: 'start', display: 'A…', rank: -1 },
      upper: { kind: 'end', display: '…Z', rank: PROTOTYPE_DICTIONARY.entries.length },
      candidateCount: PROTOTYPE_DICTIONARY.entries.length,
    })
    expect(getAttemptsRemaining(state)).toBe(10)
  })

  it('mueve el límite correcto para palabras anteriores y posteriores', () => {
    const initial = createMangoGame()
    const after = expectAccepted(submitGuess(initial, 'radio'))

    expect(after.guess).toMatchObject({
      display: 'radio',
      relation: 'after',
      wordsBetweenAnswer: 12,
    })
    expect(getRemainingRange(after.state).upper.display).toBe('radio')
    expect(getRemainingRange(after.state).candidateCount).toBe(46)

    const before = expectAccepted(submitGuess(after.state, 'cable'))

    expect(before.guess.relation).toBe('before')
    expect(getRemainingRange(before.state)).toMatchObject({
      lower: { display: 'cable' },
      upper: { display: 'radio' },
      candidateCount: 28,
    })
    expect(initial.guesses).toHaveLength(0)
  })

  it('gana al acertar y rechaza nuevos intentos después del resultado', () => {
    const win = expectAccepted(submitGuess(createMangoGame(), ' MANGO '))

    expect(win.guess).toMatchObject({ display: 'mango', relation: 'equal' })
    expect(win.state.status).toBe('won')
    expect(getRemainingRange(win.state).candidateCount).toBe(0)
    expect(getGameResult(win.state)).toEqual({
      status: 'won',
      attemptsUsed: 1,
      attemptsRemaining: 9,
      answer: 'mango',
    })
    expectRejected(submitGuess(win.state, 'radio'), 'game-over')
  })

  it('pierde después de diez intentos válidos dentro del intervalo', () => {
    const guesses = [
      'abeja',
      'zorro',
      'cable',
      'viaje',
      'dulce',
      'tarde',
      'jugar',
      'radio',
      'limón',
      'perro',
    ]
    let state = createMangoGame()

    for (const guess of guesses) {
      state = expectAccepted(submitGuess(state, guess)).state
    }

    expect(state.status).toBe('lost')
    expect(getGameResult(state)).toEqual({
      status: 'lost',
      attemptsUsed: 10,
      attemptsRemaining: 0,
      answer: 'mango',
    })
  })

  it('no consume intentos inválidos, repetidos o fuera del rango', () => {
    const initial = createMangoGame()

    expectRejected(submitGuess(initial, ''), 'empty')
    expectRejected(submitGuess(initial, 'ab3ja'), 'invalid-characters')
    expectRejected(submitGuess(initial, 'sol'), 'wrong-length')
    expectRejected(submitGuess(initial, 'xxxxx'), 'unknown-word')

    const accepted = expectAccepted(submitGuess(initial, 'radio')).state

    expectRejected(submitGuess(accepted, 'radio'), 'duplicate')
    expectRejected(submitGuess(accepted, 'zorro'), 'outside-range')
    expect(accepted.guesses).toHaveLength(1)
    expect(getAttemptsRemaining(accepted)).toBe(9)
  })

  it('acepta una palabra sin tilde, muestra su grafía y mantiene ñ distinta de n', () => {
    const accentGame = createGame({
      dictionary: PROTOTYPE_DICTIONARY,
      answer: 'árbol',
      maxAttempts: 10,
    })
    const win = expectAccepted(submitGuess(accentGame, 'arbol'))

    expect(win.guess.display).toBe('árbol')

    const enyeGame = createGame({
      dictionary: PROTOTYPE_DICTIONARY,
      answer: 'ñandú',
      maxAttempts: 10,
    })

    expectRejected(submitGuess(enyeGame, 'ninez'), 'unknown-word')
    expectAccepted(submitGuess(enyeGame, 'NIÑEZ'))
  })

  it('detecta una repetición aunque cambie la tilde del input', () => {
    const first = expectAccepted(submitGuess(createMangoGame(), 'árbol')).state

    expectRejected(submitGuess(first, 'arbol'), 'duplicate')
    expect(first.guesses).toHaveLength(1)
  })
})
