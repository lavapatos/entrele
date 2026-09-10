import { DICTIONARY_VERSION } from '../game/game-data'
import { PrivateAccessError } from '../private-access/types'
import type {
  CompletedDailyResult,
  PrivateDailyPuzzle,
  PrivateGameGateway,
  PrivateIdentity,
  SyncedDailyResult,
} from '../private-access/types'

const TEST_IDENTITY: PrivateIdentity = Object.freeze({
  id: 'private-test-user',
  email: 'tester@entrele.example.com',
})

type FakePrivateGameGatewayOptions = Readonly<{
  signedIn?: boolean
  answer?: string
  dateKey?: string
  results?: readonly CompletedDailyResult[]
}>

export class FakePrivateGameGateway implements PrivateGameGateway {
  private identity: PrivateIdentity | null
  private puzzle: PrivateDailyPuzzle
  private readonly listeners = new Set<(identity: PrivateIdentity | null) => void>()
  private results: SyncedDailyResult[]

  constructor(options: FakePrivateGameGatewayOptions = {}) {
    this.identity = options.signedIn === false ? null : TEST_IDENTITY
    this.puzzle = {
      answer: options.answer ?? 'mango',
      dateKey: options.dateKey ?? '2026-01-01',
      dictionaryVersion: DICTIONARY_VERSION,
    }
    this.results = (options.results ?? []).map((result) => ({
      ...result,
      completedAt: `${result.dateKey}T12:00:00.000Z`,
    }))
  }

  get savedResults(): readonly SyncedDailyResult[] {
    return this.results
  }

  async getIdentity(): Promise<PrivateIdentity | null> {
    return this.identity
  }

  watchIdentity(listener: (identity: PrivateIdentity | null) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  async signIn(username: string, password: string): Promise<PrivateIdentity> {
    if (username !== 'tester' || password !== 'correct-password') {
      throw new PrivateAccessError('invalid-credentials', 'Credenciales de prueba inválidas.')
    }

    this.identity = TEST_IDENTITY
    this.notifyIdentity()
    return TEST_IDENTITY
  }

  async signOut(): Promise<void> {
    this.identity = null
    this.notifyIdentity()
  }

  async loadDailyPuzzle(): Promise<PrivateDailyPuzzle> {
    if (!this.identity) throw new PrivateAccessError('unauthorized', 'Falta una sesión de prueba.')
    return this.puzzle
  }

  async loadCompletedResults(): Promise<readonly SyncedDailyResult[]> {
    if (!this.identity) throw new PrivateAccessError('unauthorized', 'Falta una sesión de prueba.')
    return this.results
  }

  async saveCompletedResult(result: CompletedDailyResult): Promise<void> {
    if (!this.identity) throw new PrivateAccessError('unauthorized', 'Falta una sesión de prueba.')
    if (this.results.some((storedResult) => storedResult.dateKey === result.dateKey)) return

    this.results = [...this.results, { ...result, completedAt: `${result.dateKey}T12:00:00.000Z` }]
  }

  setDailyPuzzle(answer: string, dateKey: string): void {
    this.puzzle = { answer, dateKey, dictionaryVersion: DICTIONARY_VERSION }
  }

  private notifyIdentity(): void {
    for (const listener of this.listeners) listener(this.identity)
  }
}
