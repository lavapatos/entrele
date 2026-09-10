import type { GameStatus } from '../game/types'

export type PrivateIdentity = Readonly<{
  id: string
  email: string | null
}>

export type PrivateDailyPuzzle = Readonly<{
  answer: string
  dateKey: string
  dictionaryVersion: string
}>

export type CompletedDailyResult = Readonly<{
  dateKey: string
  status: Exclude<GameStatus, 'playing'>
  attemptsUsed: number
}>

export type SyncedDailyResult = CompletedDailyResult &
  Readonly<{
    completedAt: string
  }>

export type PrivateAccessErrorReason =
  | 'not-configured'
  | 'invalid-credentials'
  | 'unauthorized'
  | 'forbidden'
  | 'offline'
  | 'unavailable'
  | 'invalid-response'
  | 'dictionary-mismatch'

export class PrivateAccessError extends Error {
  readonly reason: PrivateAccessErrorReason

  constructor(reason: PrivateAccessErrorReason, message: string) {
    super(message)
    this.name = 'PrivateAccessError'
    this.reason = reason
  }
}

export interface PrivateGameGateway {
  getIdentity(): Promise<PrivateIdentity | null>
  watchIdentity(listener: (identity: PrivateIdentity | null) => void): () => void
  signIn(username: string, password: string): Promise<PrivateIdentity>
  signOut(): Promise<void>
  loadDailyPuzzle(): Promise<PrivateDailyPuzzle>
  loadCompletedResults(): Promise<readonly SyncedDailyResult[]>
  saveCompletedResult(result: CompletedDailyResult): Promise<void>
}
