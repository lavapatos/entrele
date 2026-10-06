const MILLISECONDS_PER_DAY = 86_400_000

type PrivateDailyData = Readonly<{
  version: string
  epochDate: string
  shuffleStartDate: string
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

type AnswerSelection = Readonly<{
  answers: readonly string[]
  index: number
  pool: AnswerPool
}>

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
  const shuffleStartOffset = getDayOffset(data.shuffleStartDate, data.epochDate)
  const selection = selectAnswerPool(data, dayOffset)
  const answer =
    dayOffset < shuffleStartOffset
      ? await selectLegacyAnswer(seed, selection)
      : await selectShuffledAnswer(data, seed, selection, dayOffset, shuffleStartOffset)

  if (!answer) throw new Error('No se pudo resolver la respuesta diaria.')

  return { answer, dateKey, dictionaryVersion: data.version }
}

function selectAnswerPool(data: PrivateDailyData, dayOffset: number): AnswerSelection {
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

async function selectLegacyAnswer(seed: string, selection: AnswerSelection): Promise<string> {
  const secretOffset = await getSecretOffset(seed, selection.pool, selection.answers.length)

  return (
    selection.answers[positiveModulo(selection.index + secretOffset, selection.answers.length)] ??
    ''
  )
}

async function selectShuffledAnswer(
  data: PrivateDailyData,
  seed: string,
  selection: AnswerSelection,
  dayOffset: number,
  shuffleStartOffset: number,
): Promise<string> {
  const shuffledIndex = getPoolIndexSinceShuffleStart(
    data,
    selection.pool,
    shuffleStartOffset,
    dayOffset,
  )
  const cycle = Math.floor(shuffledIndex / selection.answers.length)
  const position = positiveModulo(shuffledIndex, selection.answers.length)
  const cycleAnswers =
    selection.pool === 'general'
      ? await createBalancedGeneralCycle(data, seed, selection.answers, cycle, shuffleStartOffset)
      : await createShuffledCycle(seed, selection.pool, selection.answers, cycle)

  return cycleAnswers[position] ?? ''
}

function getPoolIndexSinceShuffleStart(
  data: PrivateDailyData,
  pool: AnswerPool,
  shuffleStartOffset: number,
  dayOffset: number,
): number {
  let index = -1

  for (let offset = shuffleStartOffset; offset <= dayOffset; offset += 1) {
    if (selectAnswerPool(data, offset).pool === pool) index += 1
  }

  if (index < 0) throw new Error(`No se pudo calcular el índice diario de ${pool}.`)
  return index
}

async function createBalancedGeneralCycle(
  data: PrivateDailyData,
  seed: string,
  answers: readonly string[],
  targetCycle: number,
  shuffleStartOffset: number,
): Promise<readonly string[]> {
  const cutoffPool = selectAnswerPool(data, shuffleStartOffset).pool
  const previousSelection = selectAnswerPool(data, shuffleStartOffset - 1)
  const previousAnswer = await selectLegacyAnswer(seed, previousSelection)
  let forbiddenInitial = cutoffPool === 'general' ? getInitial(previousAnswer) : null
  let cycleAnswers: readonly string[] = []

  for (let cycle = 0; cycle <= targetCycle; cycle += 1) {
    cycleAnswers = await createBalancedCycle(seed, 'general', answers, cycle, forbiddenInitial)
    forbiddenInitial = getInitial(cycleAnswers.at(-1) ?? '')
  }

  return cycleAnswers
}

async function createBalancedCycle(
  seed: string,
  pool: AnswerPool,
  answers: readonly string[],
  cycle: number,
  forbiddenInitial: string | null,
): Promise<readonly string[]> {
  const random = await createSeededRandom(`${seed}:${pool}:balanced-v1:${cycle}`)
  const groups = new Map<string, string[]>()

  for (const answer of answers) {
    const initial = getInitial(answer)
    const group = groups.get(initial) ?? []
    group.push(answer)
    groups.set(initial, group)
  }

  for (const group of groups.values()) shuffle(group, random)

  const result: string[] = []
  let previousInitial = forbiddenInitial

  while (result.length < answers.length) {
    const candidates = [...groups]
      .filter(([initial, group]) => group.length > 0 && initial !== previousInitial)
      .filter(([initial, group]) => {
        const removed = group.pop()
        const feasible = canArrangeWithoutMatchingPrevious(groups, initial)
        if (removed) group.push(removed)
        return feasible
      })

    if (candidates.length === 0) {
      throw new Error('No se pudo dispersar la rotación de respuestas diarias.')
    }

    const [initial, group] = selectWeightedGroup(candidates, random)
    const answer = group.pop()

    if (!answer) throw new Error('La rotación diaria produjo una respuesta vacía.')
    result.push(answer)
    previousInitial = initial
  }

  return result
}

async function createShuffledCycle(
  seed: string,
  pool: AnswerPool,
  answers: readonly string[],
  cycle: number,
): Promise<readonly string[]> {
  const random = await createSeededRandom(`${seed}:${pool}:shuffle-v1:${cycle}`)
  const shuffled = [...answers]
  shuffle(shuffled, random)
  return shuffled
}

function canArrangeWithoutMatchingPrevious(
  groups: ReadonlyMap<string, readonly string[]>,
  previousInitial: string,
): boolean {
  const total = [...groups.values()].reduce((sum, group) => sum + group.length, 0)

  for (const [initial, group] of groups) {
    const otherCount = total - group.length
    const availableSlots = otherCount + (initial === previousInitial ? 0 : 1)
    if (group.length > availableSlots) return false
  }

  return true
}

function selectWeightedGroup(
  groups: readonly (readonly [string, string[]])[],
  random: () => number,
): readonly [string, string[]] {
  const totalWeight = groups.reduce((sum, [, group]) => sum + group.length, 0)
  let target = random() * totalWeight

  for (const candidate of groups) {
    target -= candidate[1].length
    if (target < 0) return candidate
  }

  return groups.at(-1) ?? ['', []]
}

function shuffle(values: string[], random: () => number): void {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const current = values[index]
    const replacement = values[swapIndex]

    if (current === undefined || replacement === undefined) {
      throw new Error('No se pudo barajar la rotación diaria.')
    }

    values[index] = replacement
    values[swapIndex] = current
  }
}

async function createSeededRandom(material: string): Promise<() => number> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(material))
  const view = new DataView(digest)
  let state0 = view.getUint32(0, false)
  let state1 = view.getUint32(4, false)
  let state2 = view.getUint32(8, false)
  let state3 = view.getUint32(12, false)

  if ((state0 | state1 | state2 | state3) === 0) state0 = 1

  return () => {
    const result = Math.imul(rotateLeft(Math.imul(state1, 5), 7), 9)
    const shifted = state1 << 9

    state2 ^= state0
    state3 ^= state1
    state1 ^= state2
    state0 ^= state3
    state2 ^= shifted
    state3 = rotateLeft(state3, 11)

    return (result >>> 0) / 4_294_967_296
  }
}

function rotateLeft(value: number, amount: number): number {
  return (value << amount) | (value >>> (32 - amount))
}

function getInitial(answer: string): string {
  const initial = [...answer][0]
  if (!initial) throw new Error('La respuesta diaria no tiene inicial.')
  return initial
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
