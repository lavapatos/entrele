export type DictionaryEntry = Readonly<{
  display: string
  inputKey: string
  sortRank: number
}>

export type GameDictionary = Readonly<{
  entries: readonly DictionaryEntry[]
  entriesByInputKey: Readonly<Record<string, DictionaryEntry>>
  wordLength: number
}>

export type GuessRelation = 'before' | 'after' | 'equal'
export type GameStatus = 'playing' | 'won' | 'lost'

export type Guess = Readonly<{
  raw: string
  display: string
  inputKey: string
  rank: number
  relation: GuessRelation
  rankDistance: number
}>

export type GameState = Readonly<{
  dictionary: GameDictionary
  answer: DictionaryEntry
  guesses: readonly Guess[]
  lowerBoundRank: number
  upperBoundRank: number
  maxAttempts: number
  status: GameStatus
}>

export type GameConfig = Readonly<{
  dictionary: GameDictionary
  answer: string
  maxAttempts?: number
}>

export type GuessRejectionReason =
  | 'empty'
  | 'invalid-characters'
  | 'wrong-length'
  | 'unknown-word'
  | 'duplicate'
  | 'outside-range'
  | 'game-over'

export type SubmitGuessResult =
  | Readonly<{
      accepted: true
      state: GameState
      guess: Guess
    }>
  | Readonly<{
      accepted: false
      state: GameState
      reason: GuessRejectionReason
    }>

export type RangeBound = Readonly<{
  kind: 'start' | 'word' | 'end'
  display: string
  rank: number
}>

export type RemainingRange = Readonly<{
  lower: RangeBound
  upper: RangeBound
  candidateCount: number
}>

export type RangeProximity = Readonly<{
  lastGuessDistancePercent: number | null
  closerBound: 'lower' | 'upper' | 'tie' | null
}>

export type GameResult = Readonly<{
  status: GameStatus
  attemptsUsed: number
  attemptsRemaining: number
  answer: string | null
}>
