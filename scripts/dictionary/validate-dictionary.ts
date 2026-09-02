import { readFile } from 'node:fs/promises'

import { PATHS, WORD_LENGTH, compareInputKeys, requireInputKey } from './shared.ts'

type DictionaryData = Readonly<{
  version: string
  wordLength: number
  words: readonly string[]
  answers: Readonly<{
    general: readonly string[]
    sensitive: readonly string[]
    rareSensitive: readonly string[]
  }>
  schedule: Readonly<{
    sensitiveIntervalDays: number
    sensitivePhase: number
    rareSensitiveEvery: number
  }>
}>

const data = JSON.parse(await readFile(PATHS.generatedDictionary, 'utf8')) as DictionaryData

if (!data.version || data.wordLength !== WORD_LENGTH || data.words.length === 0) {
  throw new Error('Los metadatos del diccionario generado no son válidos.')
}

const keys = data.words.map(requireInputKey)

for (let index = 0; index < keys.length; index += 1) {
  if (index > 0 && compareInputKeys(keys[index - 1] ?? '', keys[index] ?? '') >= 0) {
    throw new Error(`El orden o la unicidad falla junto a "${keys[index]}".`)
  }
}

const accepted = new Set(keys)
const answerGroups = Object.values(data.answers)
const allAnswers = answerGroups.flat()

if (answerGroups.some((group) => group.length === 0)) {
  throw new Error('Cada grupo de respuestas debe contener al menos una palabra.')
}

if (new Set(allAnswers).size !== allAnswers.length) {
  throw new Error('Las listas de respuestas contienen claves repetidas.')
}

for (const answer of allAnswers) {
  if (!accepted.has(answer)) throw new Error(`La respuesta "${answer}" no está aceptada.`)
}

const sensitiveRate = 1 / data.schedule.sensitiveIntervalDays

if (sensitiveRate < 0.01 || sensitiveRate > 0.02) {
  throw new Error('La frecuencia sensible debe mantenerse entre 1% y 2%.')
}

if (
  data.schedule.sensitivePhase < 0 ||
  data.schedule.sensitivePhase >= data.schedule.sensitiveIntervalDays ||
  data.schedule.rareSensitiveEvery < 2
) {
  throw new Error('La configuración de rotación sensible no es válida.')
}

console.log(`Validado ${data.version}: ${keys.length} palabras, ${allAnswers.length} respuestas.`)
