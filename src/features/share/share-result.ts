import type { GameStatus, GuessRelation } from '../../game/types'

export type ShareResultData = Readonly<{
  dateKey: string
  status: Exclude<GameStatus, 'playing'>
  relations: readonly GuessRelation[]
  maxAttempts: number
}>

type ShareResultOptions = ShareResultData & Readonly<{ url?: string }>

const RELATION_SYMBOLS: Record<GuessRelation, string> = {
  before: '↑',
  after: '↓',
  equal: '◆',
}

export function formatShareResult({
  dateKey,
  status,
  relations,
  maxAttempts,
  url,
}: ShareResultOptions): string {
  const attemptsUsed = relations.length
  const result = status === 'won' ? `${attemptsUsed}/${maxAttempts}` : `X/${maxAttempts}`
  const trace = relations.map((relation) => RELATION_SYMBOLS[relation]).join(' ')
  const attempts = `${'●'.repeat(attemptsUsed)}${'○'.repeat(
    Math.max(0, maxAttempts - attemptsUsed),
  )}`
  const lines = [`ENTRELE · ${formatShortDate(dateKey)} · ${result}`, trace, attempts]

  if (url) lines.push(url)
  return lines.join('\n')
}

function formatShortDate(dateKey: string): string {
  const [, month, day] = dateKey.split('-')
  if (!month || !day) throw new Error(`Fecha diaria inválida: "${dateKey}".`)
  return `${day}.${month}`
}
