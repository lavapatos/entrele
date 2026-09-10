import { readFile } from 'node:fs/promises'

import { countLetters, normalizeInput } from '../../src/game/normalize.ts'

export const PROJECT_ROOT = new URL('../../', import.meta.url)
export const WORD_LENGTH = 5
export const PIPELINE_VERSION = 1
export const SOURCE_PACKAGE = 'dictionary-es-cl'
export const SOURCE_PACKAGE_VERSION = '2.0.0'
export const SOURCE_DICTIONARY_VERSION = '2.8'
export const SOURCE_LICENSE = 'MPL-1.1-or-later'

export const PATHS = Object.freeze({
  additions: new URL('data/curated/additions.txt', PROJECT_ROOT),
  exclusions: new URL('data/curated/exclusions.txt', PROJECT_ROOT),
  displayOverrides: new URL('data/curated/display-overrides.json', PROJECT_ROOT),
  generalAnswers: new URL('data/curated/answers-general.txt', PROJECT_ROOT),
  sensitiveAnswers: new URL('data/curated/answers-sensitive.txt', PROJECT_ROOT),
  rareSensitiveAnswers: new URL('data/curated/answers-sensitive-rare.txt', PROJECT_ROOT),
  inspectionSamples: new URL('data/curated/inspection-samples.json', PROJECT_ROOT),
  generatedDictionary: new URL('src/game/generated/dictionary-data.json', PROJECT_ROOT),
  generatedPrivateDailyData: new URL('supabase/functions/_shared/daily-data.ts', PROJECT_ROOT),
  generatedReport: new URL('data/generated/dictionary-report.json', PROJECT_ROOT),
})

const SPANISH_ALPHABET = [...'abcdefghijklmnñopqrstuvwxyz']
const LETTER_ORDER = new Map(SPANISH_ALPHABET.map((letter, index) => [letter, index]))
const LOWERCASE_SPANISH_WORD = /^[a-záéíóúüñ]+$/u

export function requireInputKey(display: string): string {
  const normalized = normalizeInput(display)

  if (!normalized.ok || countLetters(normalized.inputKey) !== WORD_LENGTH) {
    throw new Error(`La palabra "${display}" no es una entrada española de ${WORD_LENGTH} letras.`)
  }

  return normalized.inputKey
}

export function isLowercaseSpanishWord(display: string): boolean {
  return LOWERCASE_SPANISH_WORD.test(display) && display === display.normalize('NFC')
}

export function compareInputKeys(left: string, right: string): number {
  const leftLetters = [...left]
  const rightLetters = [...right]
  const length = Math.min(leftLetters.length, rightLetters.length)

  for (let index = 0; index < length; index += 1) {
    const leftOrder = LETTER_ORDER.get(leftLetters[index] ?? '')
    const rightOrder = LETTER_ORDER.get(rightLetters[index] ?? '')

    if (leftOrder === undefined || rightOrder === undefined) {
      throw new Error(`No se puede ordenar "${left}" junto a "${right}".`)
    }

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder
    }
  }

  return leftLetters.length - rightLetters.length
}

export function compareDisplayVariants(left: string, right: string): number {
  const accentDifference = countMarks(left) - countMarks(right)
  return accentDifference || compareCodePoints(left, right)
}

export async function readCuratedLines(url: URL): Promise<string[]> {
  const source = await readFile(url, 'utf8')
  const entries = source
    .split(/\r?\n/u)
    .map((line) =>
      line
        .replace(/(?:^|\s+)#.*$/u, '')
        .trim()
        .normalize('NFC'),
    )
    .filter(Boolean)

  const duplicates = entries.filter((entry, index) => entries.indexOf(entry) !== index)

  if (duplicates.length > 0) {
    throw new Error(
      `Hay entradas curadas duplicadas en ${url.pathname}: ${[...new Set(duplicates)].join(', ')}`,
    )
  }

  return entries
}

export async function readJson<T>(url: URL): Promise<T> {
  return JSON.parse(await readFile(url, 'utf8')) as T
}

export function toInputKeys(displays: readonly string[], label: string): string[] {
  const keys = displays.map(requireInputKey)
  const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index)

  if (duplicates.length > 0) {
    throw new Error(
      `El grupo ${label} repite claves sin tilde: ${[...new Set(duplicates)].join(', ')}`,
    )
  }

  return keys
}

function countMarks(value: string): number {
  return [...value.normalize('NFD')].filter((character) => /\p{M}/u.test(character)).length
}

function compareCodePoints(left: string, right: string): number {
  const leftPoints = [...left].map((character) => character.codePointAt(0) ?? 0)
  const rightPoints = [...right].map((character) => character.codePointAt(0) ?? 0)
  const length = Math.min(leftPoints.length, rightPoints.length)

  for (let index = 0; index < length; index += 1) {
    if (leftPoints[index] !== rightPoints[index]) {
      return (leftPoints[index] ?? 0) - (rightPoints[index] ?? 0)
    }
  }

  return leftPoints.length - rightPoints.length
}
