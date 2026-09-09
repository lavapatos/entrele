import { submitGuess } from '../game/engine'
import { DICTIONARY_VERSION } from '../game/game-data'
import { countLetters, normalizeInput } from '../game/normalize'
import type { GameSession } from '../game/game-data'
import type { GameState } from '../game/types'
import { getBrowserStorage } from './browser-storage'
import type { StorageAdapter } from './browser-storage'
import { DAILY_GAME_STORAGE_VERSION, migrateDailyGame, type StoredDailyGame } from './migrations'

export const DAILY_GAME_STORAGE_KEY = 'entrele:daily-game:v1'

export type RestoredDailyGame = Readonly<{
  game: GameState
  draft: string
}>

type DailyGameToStore = Readonly<{
  dateKey: string
  game: GameState
  draft: string
}>

export function loadDailyGame(
  session: GameSession,
  storage: StorageAdapter | null = getBrowserStorage(),
): RestoredDailyGame {
  const fallback = Object.freeze({ game: session.game, draft: '' })
  if (!storage) return fallback

  try {
    const rawValue = storage.getItem(DAILY_GAME_STORAGE_KEY)
    if (!rawValue) return fallback

    const stored = migrateDailyGame(rawValue)
    if (
      !stored ||
      stored.dateKey !== session.dateKey ||
      stored.dictionaryVersion !== DICTIONARY_VERSION
    ) {
      storage.removeItem(DAILY_GAME_STORAGE_KEY)
      return fallback
    }

    const game = replayGuesses(session.game, stored)
    if (!game) {
      storage.removeItem(DAILY_GAME_STORAGE_KEY)
      return fallback
    }

    return Object.freeze({
      game,
      draft: isValidDraft(stored.draft, game.dictionary.wordLength) ? stored.draft : '',
    })
  } catch {
    return fallback
  }
}

export function saveDailyGame(
  snapshot: DailyGameToStore,
  storage: StorageAdapter | null = getBrowserStorage(),
): void {
  if (!storage) return

  const stored: StoredDailyGame = {
    version: DAILY_GAME_STORAGE_VERSION,
    dateKey: snapshot.dateKey,
    dictionaryVersion: DICTIONARY_VERSION,
    guesses: snapshot.game.guesses.map((guess) => guess.inputKey),
    draft: snapshot.draft,
  }

  try {
    storage.setItem(DAILY_GAME_STORAGE_KEY, JSON.stringify(stored))
  } catch {
    // La partida sigue funcionando aunque el navegador no permita persistencia.
  }
}

function replayGuesses(initialGame: GameState, stored: StoredDailyGame): GameState | null {
  let game = initialGame

  for (const inputKey of stored.guesses) {
    const submission = submitGuess(game, inputKey)
    if (!submission.accepted) return null
    game = submission.state
  }

  return game
}

function isValidDraft(draft: string, wordLength: number): boolean {
  if (draft.length === 0) return true

  const normalized = normalizeInput(draft)
  return normalized.ok && countLetters(normalized.inputKey) <= wordLength
}
