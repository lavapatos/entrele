import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'

import { DICTIONARY_VERSION } from '../game/game-data'
import {
  PrivateAccessError,
  type CompletedDailyResult,
  type PrivateDailyPuzzle,
  type PrivateGameGateway,
  type PrivateIdentity,
  type SyncedDailyResult,
} from './types'

type SupabasePrivateAccessConfig = Readonly<{
  url?: string
  publishableKey?: string
}>

export function createSupabasePrivateGameGateway(
  config: SupabasePrivateAccessConfig = readConfig(),
): PrivateGameGateway | null {
  const url = config.url?.trim()
  const publishableKey = config.publishableKey?.trim()

  if (!url || !publishableKey) return null

  return new SupabasePrivateGameGateway(
    createClient(url, publishableKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    }),
  )
}

export class SupabasePrivateGameGateway implements PrivateGameGateway {
  constructor(private readonly client: SupabaseClient) {}

  async getIdentity(): Promise<PrivateIdentity | null> {
    const { data, error } = await this.client.auth.getSession()
    if (error) throw toAccessError(error)
    return data.session ? toIdentity(data.session.user) : null
  }

  watchIdentity(listener: (identity: PrivateIdentity | null) => void): () => void {
    const { data } = this.client.auth.onAuthStateChange((_event, session) => {
      listener(session ? toIdentity(session.user) : null)
    })

    return () => data.subscription.unsubscribe()
  }

  async signIn(username: string, password: string): Promise<PrivateIdentity> {
    ensureOnline()

    const email = usernameToAuthEmail(username)

    const { data, error } = await this.client.auth.signInWithPassword({ email, password })
    if (error) {
      const reason = error.status === 400 ? 'invalid-credentials' : 'unavailable'
      throw new PrivateAccessError(reason, 'No fue posible iniciar sesión.')
    }
    if (!data.user) {
      throw new PrivateAccessError('invalid-response', 'La sesión no identificó a un usuario.')
    }

    return toIdentity(data.user)
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut()
    if (error) throw toAccessError(error)
  }

  async loadDailyPuzzle(): Promise<PrivateDailyPuzzle> {
    ensureOnline()

    const { data, error } = await this.client.functions.invoke('daily', { method: 'POST' })
    if (error) throw toAccessError(error)

    return parseDailyPuzzle(data, DICTIONARY_VERSION)
  }

  async loadCompletedResults(): Promise<readonly SyncedDailyResult[]> {
    ensureOnline()

    const { data, error } = await this.client
      .from('daily_results')
      .select('puzzle_date, won, attempts, completed_at')
      .order('puzzle_date', { ascending: true })

    if (error) throw toAccessError(error)
    return (data ?? []).map((row) => parseDailyResultRow(row))
  }

  async saveCompletedResult(result: CompletedDailyResult): Promise<void> {
    ensureOnline()

    const { error } = await this.client.from('daily_results').insert({
      puzzle_date: result.dateKey,
      won: result.status === 'won',
      attempts: result.attemptsUsed,
    })

    if (error?.code === '23505') return
    if (error) throw toAccessError(error)
  }
}

export function usernameToAuthEmail(username: string): string {
  const normalized = username.trim().toLocaleLowerCase('es-CL')

  if (
    normalized.length > 32 ||
    !/^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/u.test(normalized) ||
    normalized.includes('..')
  ) {
    throw new PrivateAccessError('invalid-credentials', 'El usuario no es válido.')
  }

  return `${normalized}@entrele.example.com`
}

export function parseDailyPuzzle(value: unknown, expectedVersion: string): PrivateDailyPuzzle {
  if (
    !isRecord(value) ||
    typeof value.answer !== 'string' ||
    !/^[a-zñ]{5}$/u.test(value.answer) ||
    typeof value.dateKey !== 'string' ||
    !isDateKey(value.dateKey) ||
    typeof value.dictionaryVersion !== 'string'
  ) {
    throw new PrivateAccessError('invalid-response', 'La palabra diaria recibida no es válida.')
  }

  if (value.dictionaryVersion !== expectedVersion) {
    throw new PrivateAccessError(
      'dictionary-mismatch',
      'La palabra diaria requiere una versión más reciente del juego.',
    )
  }

  return {
    answer: value.answer,
    dateKey: value.dateKey,
    dictionaryVersion: value.dictionaryVersion,
  }
}

export function parseDailyResultRow(value: unknown): SyncedDailyResult {
  if (
    !isRecord(value) ||
    typeof value.puzzle_date !== 'string' ||
    !isDateKey(value.puzzle_date) ||
    typeof value.won !== 'boolean' ||
    typeof value.attempts !== 'number' ||
    !Number.isInteger(value.attempts) ||
    value.attempts < 1 ||
    value.attempts > 10 ||
    typeof value.completed_at !== 'string' ||
    !Number.isFinite(Date.parse(value.completed_at))
  ) {
    throw new PrivateAccessError('invalid-response', 'El historial diario recibido no es válido.')
  }

  return {
    dateKey: value.puzzle_date,
    status: value.won ? 'won' : 'lost',
    attemptsUsed: value.attempts,
    completedAt: value.completed_at,
  }
}

function readConfig(): SupabasePrivateAccessConfig {
  return {
    url: import.meta.env.VITE_SUPABASE_URL,
    publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  }
}

function toIdentity(user: User): PrivateIdentity {
  return { id: user.id, email: user.email ?? null }
}

function ensureOnline(): void {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new PrivateAccessError('offline', 'Esta acción necesita conexión.')
  }
}

function toAccessError(error: unknown): PrivateAccessError {
  if (error instanceof PrivateAccessError) return error

  const status = getErrorStatus(error)
  if (status === 401) return new PrivateAccessError('unauthorized', 'La sesión ya no es válida.')
  if (status === 403) return new PrivateAccessError('forbidden', 'Esta cuenta no tiene acceso.')

  return new PrivateAccessError('unavailable', 'El servicio privado no está disponible.')
}

function getErrorStatus(error: unknown): number | null {
  if (!isRecord(error)) return null
  if (typeof error.status === 'number') return error.status
  if (error.context instanceof Response) return error.context.status
  return null
}

function isDateKey(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false

  const timestamp = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
