import type { DictionaryEntry } from './types'

const MILLISECONDS_PER_DAY = 86_400_000

export type DateProvider = () => Date

export type DailyAnswerConfig = Readonly<{
  answers: readonly DictionaryEntry[]
  epochDate: string
  timeZone: string
  sensitiveAnswers?: readonly DictionaryEntry[]
  rareSensitiveAnswers?: readonly DictionaryEntry[]
  sensitiveIntervalDays?: number
  sensitivePhase?: number
  rareSensitiveEvery?: number
}>

export type DailyAnswer = Readonly<{
  answer: DictionaryEntry
  dateKey: string
  dayOffset: number
  pool: 'general' | 'sensitive' | 'rare-sensitive'
}>

export function getDateKey(date: Date, timeZone: string): string {
  if (Number.isNaN(date.getTime())) {
    throw new Error('La fecha diaria no es válida.')
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const year = getDatePart(parts, 'year')
  const month = getDatePart(parts, 'month')
  const day = getDatePart(parts, 'day')

  return `${year}-${month}-${day}`
}

export function getDayOffset(dateKey: string, epochDate: string): number {
  return Math.trunc(
    (civilDateToTimestamp(dateKey) - civilDateToTimestamp(epochDate)) / MILLISECONDS_PER_DAY,
  )
}

export function selectDailyAnswer(
  config: DailyAnswerConfig,
  getNow: DateProvider = () => new Date(),
): DailyAnswer {
  if (config.answers.length === 0) {
    throw new Error('La lista de respuestas diarias no puede estar vacía.')
  }

  const dateKey = getDateKey(getNow(), config.timeZone)
  const dayOffset = getDayOffset(dateKey, config.epochDate)
  const selection = selectAnswerPool(config, dayOffset)
  const answer = selection.answers[positiveModulo(selection.index, selection.answers.length)]

  if (!answer) {
    throw new Error('No se pudo resolver la respuesta diaria.')
  }

  return { answer, dateKey, dayOffset, pool: selection.pool }
}

function selectAnswerPool(
  config: DailyAnswerConfig,
  dayOffset: number,
): Readonly<{
  answers: readonly DictionaryEntry[]
  index: number
  pool: DailyAnswer['pool']
}> {
  const sensitiveAnswers = config.sensitiveAnswers ?? []

  if (sensitiveAnswers.length === 0) {
    return { answers: config.answers, index: dayOffset, pool: 'general' }
  }

  const interval = config.sensitiveIntervalDays ?? 64
  const phase = config.sensitivePhase ?? 0
  const rareEvery = config.rareSensitiveEvery ?? 4

  if (
    !Number.isInteger(interval) ||
    interval <= 0 ||
    !Number.isInteger(phase) ||
    phase < 0 ||
    phase >= interval ||
    !Number.isInteger(rareEvery) ||
    rareEvery < 2
  ) {
    throw new Error('La rotación de respuestas sensibles no es válida.')
  }

  if (positiveModulo(dayOffset - phase, interval) !== 0) {
    return {
      answers: config.answers,
      index: dayOffset - countSensitiveDaysBefore(dayOffset, interval, phase),
      pool: 'general',
    }
  }

  const occurrence = Math.floor((dayOffset - phase) / interval)
  const rareAnswers = config.rareSensitiveAnswers ?? []

  if (rareAnswers.length > 0 && positiveModulo(occurrence, rareEvery) === 0) {
    return {
      answers: rareAnswers,
      index: Math.floor(occurrence / rareEvery),
      pool: 'rare-sensitive',
    }
  }

  const rareBefore = Math.floor((occurrence - 1) / rareEvery) - Math.floor(-1 / rareEvery)
  return {
    answers: sensitiveAnswers,
    index: occurrence - rareBefore,
    pool: 'sensitive',
  }
}

function countSensitiveDaysBefore(dayOffset: number, interval: number, phase: number): number {
  return Math.floor((dayOffset - 1 - phase) / interval) - Math.floor((-1 - phase) / interval)
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor
}

function getDatePart(
  parts: readonly Intl.DateTimeFormatPart[],
  type: 'year' | 'month' | 'day',
): string {
  const value = parts.find((part) => part.type === type)?.value

  if (!value) {
    throw new Error(`No se pudo obtener ${type} para la fecha diaria.`)
  }

  return value
}

function civilDateToTimestamp(dateKey: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey)

  if (!match) {
    throw new Error(`La fecha civil "${dateKey}" debe usar YYYY-MM-DD.`)
  }

  const [, yearText, monthText, dayText] = match
  const timestamp = Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText))

  if (new Date(timestamp).toISOString().slice(0, 10) !== dateKey) {
    throw new Error(`La fecha civil "${dateKey}" no existe.`)
  }

  return timestamp
}
