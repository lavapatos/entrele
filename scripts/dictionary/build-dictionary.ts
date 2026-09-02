import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

import esCl from 'dictionary-es-cl'
import nspell from 'nspell'

import {
  PATHS,
  PIPELINE_VERSION,
  SOURCE_DICTIONARY_VERSION,
  SOURCE_LICENSE,
  SOURCE_PACKAGE,
  SOURCE_PACKAGE_VERSION,
  WORD_LENGTH,
  compareDisplayVariants,
  compareInputKeys,
  isLowercaseSpanishWord,
  readCuratedLines,
  readJson,
  requireInputKey,
  toInputKeys,
} from './shared.ts'

type DisplayOverrides = Record<string, string>
type InspectionSamples = Readonly<{
  common: readonly string[]
  rare: readonly string[]
  chilean: readonly string[]
  rejected: readonly Readonly<{ input: string; reason: string }>[]
}>
type SpellWithData = Readonly<{
  data: Readonly<Record<string, unknown>>
  correct(word: string): boolean
}>

const SENSITIVE_INTERVAL_DAYS = 64
const RARE_SENSITIVE_EVERY = 4
const SENSITIVE_PHASE = 37

const additions = await readCuratedLines(PATHS.additions)
const exclusions = new Set((await readCuratedLines(PATHS.exclusions)).map(requireInputKey))
const generalDisplays = await readCuratedLines(PATHS.generalAnswers)
const sensitiveDisplays = await readCuratedLines(PATHS.sensitiveAnswers)
const rareSensitiveDisplays = await readCuratedLines(PATHS.rareSensitiveAnswers)
const displayOverrides = await readJson<DisplayOverrides>(PATHS.displayOverrides)
const inspectionSamples = await readJson<InspectionSamples>(PATHS.inspectionSamples)
const spell = nspell(esCl) as unknown as SpellWithData
const sourceForms = Object.keys(spell.data)
const variantsByKey = new Map<string, Set<string>>()
let rejectedCharactersOrCase = 0
let rejectedLength = 0
let rejectedByHunspell = 0

for (const rawDisplay of sourceForms) {
  const display = rawDisplay.normalize('NFC')

  if (!isLowercaseSpanishWord(display)) {
    rejectedCharactersOrCase += 1
    continue
  }

  const inputKey = requireInputKeyIfLength(display)

  if (!inputKey) {
    rejectedLength += 1
    continue
  }

  if (!spell.correct(display)) {
    rejectedByHunspell += 1
    continue
  }

  addVariant(variantsByKey, inputKey, display)
}

for (const display of additions) {
  if (!isLowercaseSpanishWord(display)) {
    throw new Error(`La adición "${display}" debe estar en minúsculas y usar letras españolas.`)
  }

  addVariant(variantsByKey, requireInputKey(display), display)
}

for (const inputKey of exclusions) {
  variantsByKey.delete(inputKey)
}

const answerGroups = [
  ['general', generalDisplays],
  ['sensible', sensitiveDisplays],
  ['sensible muy infrecuente', rareSensitiveDisplays],
] as const
const preferredDisplayByKey = new Map<string, string>()

for (const [label, displays] of answerGroups) {
  for (const display of displays) {
    const inputKey = requireInputKey(display)
    const variants = variantsByKey.get(inputKey)

    if (!variants?.has(display)) {
      throw new Error(
        `La respuesta ${label} "${display}" no existe en la fuente ni en las adiciones.`,
      )
    }

    setPreferredDisplay(preferredDisplayByKey, inputKey, display)
  }
}

for (const [rawKey, display] of Object.entries(displayOverrides)) {
  const inputKey = requireInputKey(rawKey)

  if (inputKey !== rawKey || !variantsByKey.get(inputKey)?.has(display)) {
    throw new Error(
      `La preferencia visual "${rawKey}": "${display}" no corresponde al diccionario.`,
    )
  }

  setPreferredDisplay(preferredDisplayByKey, inputKey, display)
}

const entries = [...variantsByKey].map(([inputKey, variants]) => ({
  display:
    preferredDisplayByKey.get(inputKey) ??
    [...variants].sort(compareDisplayVariants)[0] ??
    inputKey,
  inputKey,
  variantCount: variants.size,
}))
entries.sort((left, right) => compareInputKeys(left.inputKey, right.inputKey))

const acceptedKeys = new Set(entries.map((entry) => entry.inputKey))
validateInspectionSamples(inspectionSamples, acceptedKeys)

const generalAnswers = toInputKeys(generalDisplays, 'respuestas generales')
const sensitiveAnswers = toInputKeys(sensitiveDisplays, 'respuestas sensibles')
const rareSensitiveAnswers = toInputKeys(
  rareSensitiveDisplays,
  'respuestas sensibles muy infrecuentes',
)
assertDisjointAnswerGroups(generalAnswers, sensitiveAnswers, rareSensitiveAnswers)

const curatedSources = await Promise.all(
  Object.values(PATHS)
    .filter((url) => url.pathname.includes('/data/curated/'))
    .map((url) => readFile(url)),
)
const fingerprint = createHash('sha256')
  .update(esCl.aff)
  .update(esCl.dic)
  .update(String(PIPELINE_VERSION))
for (const source of curatedSources) fingerprint.update(source)
const version = `rla-es-cl-${SOURCE_DICTIONARY_VERSION}.${PIPELINE_VERSION}+${fingerprint.digest('hex').slice(0, 12)}`

const dictionaryData = {
  version,
  wordLength: WORD_LENGTH,
  words: entries.map((entry) => entry.display),
  answers: {
    general: generalAnswers,
    sensitive: sensitiveAnswers,
    rareSensitive: rareSensitiveAnswers,
  },
  schedule: {
    sensitiveIntervalDays: SENSITIVE_INTERVAL_DAYS,
    sensitivePhase: SENSITIVE_PHASE,
    rareSensitiveEvery: RARE_SENSITIVE_EVERY,
  },
} as const
const report = {
  version,
  source: {
    package: SOURCE_PACKAGE,
    packageVersion: SOURCE_PACKAGE_VERSION,
    dictionaryVersion: SOURCE_DICTIONARY_VERSION,
    selectedLicense: SOURCE_LICENSE,
  },
  totals: {
    sourceForms: sourceForms.length,
    rejectedCharactersOrCase,
    rejectedLength,
    rejectedByHunspell,
    curatedAdditions: additions.length,
    curatedExclusions: exclusions.size,
    acceptedInputKeys: entries.length,
    collapsedVariants: entries.reduce((total, entry) => total + entry.variantCount - 1, 0),
    entriesWithAccents: entries.filter((entry) => /[áéíóúü]/u.test(entry.display)).length,
    entriesWithEnye: entries.filter((entry) => entry.display.includes('ñ')).length,
    generalAnswers: generalAnswers.length,
    sensitiveAnswers: sensitiveAnswers.length,
    rareSensitiveAnswers: rareSensitiveAnswers.length,
  },
  schedule: {
    sensitiveDaysPercent: (100 / SENSITIVE_INTERVAL_DAYS).toFixed(4),
    rareSensitiveDaysPercent: (100 / (SENSITIVE_INTERVAL_DAYS * RARE_SENSITIVE_EVERY)).toFixed(4),
  },
  samples: inspectionSamples,
} as const

await mkdir(new URL('.', PATHS.generatedDictionary), { recursive: true })
await mkdir(new URL('.', PATHS.generatedReport), { recursive: true })
await writeFile(PATHS.generatedDictionary, `${JSON.stringify(dictionaryData)}\n`)
await writeFile(PATHS.generatedReport, `${JSON.stringify(report, null, 2)}\n`)

console.log(
  `Diccionario ${version}: ${entries.length} palabras y ${generalAnswers.length + sensitiveAnswers.length + rareSensitiveAnswers.length} respuestas.`,
)

function requireInputKeyIfLength(display: string): string | null {
  try {
    return requireInputKey(display)
  } catch {
    return null
  }
}

function addVariant(target: Map<string, Set<string>>, inputKey: string, display: string): void {
  const variants = target.get(inputKey) ?? new Set<string>()
  variants.add(display)
  target.set(inputKey, variants)
}

function setPreferredDisplay(target: Map<string, string>, inputKey: string, display: string): void {
  const current = target.get(inputKey)

  if (current && current !== display) {
    throw new Error(`La clave "${inputKey}" intenta mostrar tanto "${current}" como "${display}".`)
  }

  target.set(inputKey, display)
}

function assertDisjointAnswerGroups(...groups: readonly string[][]): void {
  const seen = new Set<string>()

  for (const group of groups) {
    for (const key of group) {
      if (seen.has(key)) throw new Error(`La respuesta "${key}" aparece en más de un grupo.`)
      seen.add(key)
    }
  }
}

function validateInspectionSamples(
  samples: InspectionSamples,
  acceptedKeys: ReadonlySet<string>,
): void {
  for (const display of [...samples.common, ...samples.rare, ...samples.chilean]) {
    if (!acceptedKeys.has(requireInputKey(display))) {
      throw new Error(`La muestra aceptada "${display}" no está en el diccionario.`)
    }
  }

  for (const sample of samples.rejected) {
    const normalized = normalizeRejectedSample(sample.input)
    if (normalized && acceptedKeys.has(normalized)) {
      throw new Error(`La muestra rechazada "${sample.input}" sí está en el diccionario.`)
    }
  }
}

function normalizeRejectedSample(display: string): string | null {
  try {
    return requireInputKey(display)
  } catch {
    return null
  }
}
