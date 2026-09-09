import type { DictionaryEntry } from './types'

export type RNG = () => number

export function selectTrainingAnswer(
  answers: readonly DictionaryEntry[],
  previousAnswerInputKey: string | null,
  rng: RNG = Math.random,
): DictionaryEntry {
  if (answers.length === 0) throw new Error('El modo práctica necesita al menos una respuesta.')

  const candidates =
    answers.length > 1
      ? answers.filter((answer) => answer.inputKey !== previousAnswerInputKey)
      : answers
  const randomValue = rng()
  const boundedValue = Number.isFinite(randomValue)
    ? Math.min(Math.max(randomValue, 0), 0.9999999999999999)
    : 0
  const selected = candidates[Math.floor(boundedValue * candidates.length)]

  if (!selected) throw new Error('No se pudo elegir una respuesta para el modo práctica.')
  return selected
}
