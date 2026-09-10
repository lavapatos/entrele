const MILLISECONDS_PER_DAY = 86_400_000

type PrivateDailyData = Readonly<{
  version: string
  epochDate: string
  timeZone: string
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

type AnswerPool = 'general' | 'sensitive' | 'rareSensitive'

export type PrivateDailyPuzzle = Readonly<{
  answer: string
  dateKey: string
  dictionaryVersion: string
}>

export async function selectPrivateDaily(
  data: PrivateDailyData,
  seed: string,
  now: Date = new Date(),
): Promise<PrivateDailyPuzzle> {
  if (seed.trim().length < 32) throw new Error('La semilla diaria no es válida.')

  const dateKey = getDateKey(now, data.timeZone)
  const dayOffset = getDayOffset(dateKey, data.epochDate)
  const selection = selectAnswerPool(data, dayOffset)
  const secretOffset = await getSecretOffset(seed, selection.pool, selection.answers.length)
  const answer =
    selection.answers[positiveModulo(selection.index + secretOffset, selection.answers.length)]

  if (!answer) throw new Error('No se pudo resolver la respuesta diaria.')

  return { answer, dateKey, dictionaryVersion: data.version }
}

function selectAnswerPool(
  data: PrivateDailyData,
  dayOffset: number,
): Readonly<{ answers: readonly string[]; index: number; pool: AnswerPool }> {
  const {
    sensitiveIntervalDays: interval,
    sensitivePhase: phase,
    rareSensitiveEvery,
  } = data.schedule

  if (data.answers.general.length === 0) {
    throw new Error('La lista de respuestas generales está vacía.')
  }

  if (positiveModulo(dayOffset - phase, interval) !== 0) {
    return {
      answers: data.answers.general,
      index: dayOffset - countSensitiveDaysBefore(dayOffset, interval, phase),
      pool: 'general',
    }
  }

  const occurrence = Math.floor((dayOffset - phase) / interval)

  if (
    data.answers.rareSensitive.length > 0 &&
    positiveModulo(occurrence, rareSensitiveEvery) === 0
  ) {
    return {
      answers: data.answers.rareSensitive,
      index: Math.floor(occurrence / rareSensitiveEvery),
      pool: 'rareSensitive',
    }
  }

  if (data.answers.sensitive.length === 0) {
    throw new Error('La lista de respuestas sensibles está vacía.')
  }

  const rareBefore =
    Math.floor((occurrence - 1) / rareSensitiveEvery) - Math.floor(-1 / rareSensitiveEvery)

  return {
    answers: data.answers.sensitive,
    index: occurrence - rareBefore,
    pool: 'sensitive',
  }
}

async function getSecretOffset(seed: string, pool: AnswerPool, length: number): Promise<number> {
  if (length === 0) throw new Error(`La lista ${pool} está vacía.`)

  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${seed}:${pool}`))

  return new DataView(digest).getUint32(0, false) % length
}

function getDateKey(date: Date, timeZone: string): string {
  if (Number.isNaN(date.getTime())) throw new Error('La fecha diaria no es válida.')

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

function getDayOffset(dateKey: string, epochDate: string): number {
  return Math.trunc(
    (civilDateToTimestamp(dateKey) - civilDateToTimestamp(epochDate)) / MILLISECONDS_PER_DAY,
  )
}

function countSensitiveDaysBefore(dayOffset: number, interval: number, phase: number): number {
  return Math.floor((dayOffset - 1 - phase) / interval) - Math.floor((-1 - phase) / interval)
}

function positiveModulo(value: number, divisor: number): number {
  if (!Number.isInteger(divisor) || divisor <= 0) {
    throw new Error('La configuración de respuestas diarias no es válida.')
  }

  return ((value % divisor) + divisor) % divisor
}

function getDatePart(
  parts: readonly Intl.DateTimeFormatPart[],
  type: 'year' | 'month' | 'day',
): string {
  const value = parts.find((part) => part.type === type)?.value
  if (!value) throw new Error(`No se pudo obtener ${type} para la fecha diaria.`)
  return value
}

function civilDateToTimestamp(dateKey: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey)
  if (!match) throw new Error(`La fecha civil "${dateKey}" debe usar YYYY-MM-DD.`)

  const [, yearText, monthText, dayText] = match
  const timestamp = Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText))

  if (new Date(timestamp).toISOString().slice(0, 10) !== dateKey) {
    throw new Error(`La fecha civil "${dateKey}" no existe.`)
  }

  return timestamp
}
