export type InputNormalizationResult =
  | Readonly<{ ok: true; inputKey: string }>
  | Readonly<{ ok: false; reason: 'empty' | 'invalid-characters' }>

const ENYE_PLACEHOLDER = '\uE000'
const COMBINING_MARKS = /\p{M}/gu
const VALID_SPANISH_LETTERS = /^[a-zñ]+$/u

export function normalizeInput(raw: string): InputNormalizationResult {
  const trimmed = raw.trim()

  if (trimmed.length === 0) {
    return { ok: false, reason: 'empty' }
  }

  const normalizedCase = trimmed.toLocaleLowerCase('es-CL').normalize('NFC')
  const inputKey = normalizedCase
    .replaceAll('ñ', ENYE_PLACEHOLDER)
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replaceAll(ENYE_PLACEHOLDER, 'ñ')
    .normalize('NFC')

  if (!VALID_SPANISH_LETTERS.test(inputKey)) {
    return { ok: false, reason: 'invalid-characters' }
  }

  return { ok: true, inputKey }
}

export function countLetters(inputKey: string): number {
  return [...inputKey].length
}
