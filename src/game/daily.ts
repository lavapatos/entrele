import type { DictionaryEntry } from './types'

const MILLISECONDS_PER_DAY = 86_400_000

export type DateProvider = () => Date

export type DailyAnswerConfig = Readonly<{
  answers: readonly DictionaryEntry[]
  epochDate: string
  timeZone: string
}>

export type DailyAnswer = Readonly<{
  answer: DictionaryEntry
  dateKey: string
  dayOffset: number
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
  const answerIndex =
    ((dayOffset % config.answers.length) + config.answers.length) % config.answers.length
  const answer = config.answers[answerIndex]

  if (!answer) {
    throw new Error('No se pudo resolver la respuesta diaria.')
  }

  return { answer, dateKey, dayOffset }
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
