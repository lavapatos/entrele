import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { submitGuess } from '../../game/engine'
import { createDailyGameSession, createTrainingGame } from '../../game/game-data'
import {
  getAllowedNextLetters,
  getAttemptsUsed,
  getRangeProximity,
  getRemainingRange,
  isInputPrefixWithinRange,
} from '../../game/selectors'
import type { RNG } from '../../game/training'
import type {
  GameState,
  GuessRejectionReason,
  GuessRelation,
  RangeBound,
  SubmitGuessResult,
} from '../../game/types'
import type { PrivateGameGateway } from '../../private-access/types'
import { usePrivateGameAccess } from '../../private-access/use-private-game-access'
import { loadDailyGame, saveDailyGame } from '../../storage/game-storage'
import { formatDistancePercentage, getDistanceMarkerPosition } from './distance-display'
import FriesMascot from './FriesMascot'
import GameResultDialog from './GameResultDialog'
import GameTools from './GameTools'

type DailyGameProps = Readonly<{
  now?: Date
  privateGateway: PrivateGameGateway | null
  trainingRng?: RNG
  themeControl: ReactNode
}>

type GameMode = 'daily' | 'practice'

type RoundState = Readonly<{
  game: GameState
  input: string
}>

type DailyRoundState = RoundState & Readonly<{ dateKey: string }>

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
] as const

const REJECTION_MESSAGES: Record<GuessRejectionReason, string> = {
  empty: 'Escribe una palabra.',
  'invalid-characters': 'Usa solo letras.',
  'wrong-length': 'Deben ser cinco letras.',
  'unknown-word': 'No está en el diccionario.',
  duplicate: 'Ya la probaste.',
  'outside-range': 'Palabra fuera de rango',
  'game-over': 'La partida terminó.',
}

const CORRECT_RESULT_DELAY_MS = 1050
const CLOSE_GUESS_CAMEO_THRESHOLD_PERCENT = 1
const FRIES_CAMEO_DURATION_MS = 1200
const FRIES_EASTER_EGG_WORD = 'papas'

export default function DailyGame({
  now,
  privateGateway,
  trainingRng,
  themeControl,
}: DailyGameProps) {
  const privateAccess = usePrivateGameAccess({ gateway: privateGateway, now })
  const [dailyRound, setDailyRound] = useState<DailyRoundState | null>(null)
  const [practiceRound, setPracticeRound] = useState<RoundState>(() => ({
    game: createTrainingGame(null, trainingRng),
    input: '',
  }))
  const [mode, setMode] = useState<GameMode>('practice')
  const [notice, setNotice] = useState('')
  const [resultOpen, setResultOpen] = useState(false)
  const [showFriesCameo, setShowFriesCameo] = useState(false)
  const [rejectionSequence, setRejectionSequence] = useState(0)
  const resultDelayRef = useRef<number | undefined>(undefined)
  const friesCameoDelayRef = useRef<number | undefined>(undefined)
  const dailyDateKeyRef = useRef<string | null>(null)
  const hasShownDailyFriesCameoRef = useRef(false)
  const hasShownPracticeFriesCameoRef = useRef(false)
  const activeMode: GameMode = mode === 'daily' && dailyRound ? 'daily' : 'practice'
  const activeRound = activeMode === 'daily' && dailyRound ? dailyRound : practiceRound
  const { game, input } = activeRound
  const hasShownFriesCameoRef =
    activeMode === 'daily' ? hasShownDailyFriesCameoRef : hasShownPracticeFriesCameoRef
  const range = getRemainingRange(game)
  const proximity = getRangeProximity(game)
  const attemptsUsed = getAttemptsUsed(game)
  const lastGuess = game.guesses[game.guesses.length - 1]
  const isPlaying = game.status === 'playing'
  const allowedLetters = getAllowedNextLetters(game, input)
  const isInputOutsideRange = !isInputPrefixWithinRange(game, input)
  const privateDailyNotice =
    activeMode === 'practice' &&
    privateAccess.authenticationStatus === 'signed-in' &&
    privateAccess.dailyStatus === 'unavailable'
      ? 'No se pudo cargar la diaria.'
      : ''
  const displayedNotice = isInputOutsideRange
    ? 'Palabra fuera de rango'
    : notice || privateDailyNotice

  useEffect(
    () => () => {
      if (resultDelayRef.current !== undefined) {
        window.clearTimeout(resultDelayRef.current)
      }

      if (friesCameoDelayRef.current !== undefined) {
        window.clearTimeout(friesCameoDelayRef.current)
      }
    },
    [],
  )

  useEffect(() => {
    const puzzle = privateAccess.puzzle
    if (!puzzle || puzzle.dateKey === dailyDateKeyRef.current) return

    const previousDateKey = dailyDateKeyRef.current
    const session = createDailyGameSession(puzzle)
    const restored = loadDailyGame(session)

    dailyDateKeyRef.current = session.dateKey
    hasShownDailyFriesCameoRef.current = false
    setDailyRound({
      dateKey: session.dateKey,
      game: restored.game,
      input: restored.draft,
    })

    if (restored.game.status !== 'playing') {
      privateAccess.recordCompletedResult({
        dateKey: session.dateKey,
        status: restored.game.status,
        attemptsUsed: getAttemptsUsed(restored.game),
      })
    }

    if (previousDateKey === null || mode === 'daily') {
      setMode('daily')
      resetTransientFeedback(restored.game.status !== 'playing')
    }
  }, [mode, privateAccess])

  useEffect(() => {
    if (privateAccess.authenticationStatus !== 'signed-out') return

    dailyDateKeyRef.current = null
    setDailyRound(null)
    setMode('practice')
    resetTransientFeedback(false)
  }, [privateAccess.authenticationStatus])

  function updateInput(value: string) {
    const nextInput = [...value].slice(0, game.dictionary.wordLength).join('')
    setNotice('')

    if (activeMode === 'daily' && dailyRound) {
      setDailyRound({ ...dailyRound, input: nextInput })
      saveDailyGame({ dateKey: dailyRound.dateKey, game, draft: nextInput })
      return
    }

    setPracticeRound({ game, input: nextInput })
  }

  function appendLetter(letter: string) {
    if (!isPlaying || [...input].length >= game.dictionary.wordLength) return

    updateInput(`${input}${letter.toLocaleLowerCase('es-CL')}`)
  }

  function deleteLetter() {
    updateInput([...input].slice(0, -1).join(''))
  }

  function handleSubmit() {
    const submission = submitGuess(game, input)

    if (!submission.accepted) {
      setNotice(REJECTION_MESSAGES[submission.reason])
      setRejectionSequence((current) => current + 1)
      return
    }

    const didWin = submission.state.status === 'won'
    const acceptedDistance = getRangeProximity(submission.state).lastGuessDistancePercent
    const isFriesEasterEgg = submission.guess.inputKey === FRIES_EASTER_EGG_WORD
    const isCloseGuessCameo =
      submission.state.status === 'playing' &&
      acceptedDistance !== null &&
      acceptedDistance < CLOSE_GUESS_CAMEO_THRESHOLD_PERCENT &&
      !hasShownFriesCameoRef.current
    const shouldShowFriesCameo =
      submission.state.status === 'playing' && (isFriesEasterEgg || isCloseGuessCameo)
    const nextInput = didWin ? input : ''

    setNotice(getAcceptedNotice(submission))

    if (activeMode === 'daily' && dailyRound) {
      setDailyRound({
        dateKey: dailyRound.dateKey,
        game: submission.state,
        input: nextInput,
      })
      saveDailyGame({
        dateKey: dailyRound.dateKey,
        game: submission.state,
        draft: nextInput,
      })

      if (submission.state.status !== 'playing') {
        privateAccess.recordCompletedResult({
          dateKey: dailyRound.dateKey,
          status: submission.state.status,
          attemptsUsed: getAttemptsUsed(submission.state),
        })
      }
    } else {
      setPracticeRound({ game: submission.state, input: nextInput })
    }

    if (shouldShowFriesCameo) {
      if (isCloseGuessCameo) hasShownFriesCameoRef.current = true
      setShowFriesCameo(true)
      friesCameoDelayRef.current = window.setTimeout(() => {
        setShowFriesCameo(false)
        friesCameoDelayRef.current = undefined
      }, FRIES_CAMEO_DURATION_MS)
    }

    if (didWin && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      resultDelayRef.current = window.setTimeout(() => {
        setResultOpen(true)
        resultDelayRef.current = undefined
      }, CORRECT_RESULT_DELAY_MS)
      return
    }

    setResultOpen(submission.state.status !== 'playing')
  }

  function startPractice() {
    setMode('practice')
    resetTransientFeedback(false)
  }

  function startNextPracticeRound() {
    const previousAnswerInputKey = practiceRound.game.answer.inputKey
    setPracticeRound({
      game: createTrainingGame(previousAnswerInputKey, trainingRng),
      input: '',
    })
    hasShownPracticeFriesCameoRef.current = false
    resetTransientFeedback(false)
  }

  function returnToDailyGame() {
    if (!dailyRound) {
      void privateAccess.refresh()
      return
    }

    setMode('daily')
    resetTransientFeedback(dailyRound.game.status !== 'playing')
  }

  function resetTransientFeedback(openResult: boolean) {
    if (resultDelayRef.current !== undefined) {
      window.clearTimeout(resultDelayRef.current)
      resultDelayRef.current = undefined
    }
    if (friesCameoDelayRef.current !== undefined) {
      window.clearTimeout(friesCameoDelayRef.current)
      friesCameoDelayRef.current = undefined
    }

    setNotice('')
    setResultOpen(openResult)
    setShowFriesCameo(false)
    setRejectionSequence(0)
  }

  return (
    <div className="game-form">
      {activeMode === 'practice' ? (
        <div
          className="practice-mode"
          data-has-exit={privateAccess.authenticationStatus === 'signed-in' && Boolean(dailyRound)}
          aria-label="Modo práctica"
        >
          <span>Práctica</span>
          {privateAccess.authenticationStatus === 'signed-in' && dailyRound ? (
            <button className="practice-exit" type="button" onClick={returnToDailyGame}>
              Volver a diaria
            </button>
          ) : null}
        </div>
      ) : null}
      <AttemptDots used={attemptsUsed} total={game.maxAttempts} />

      <section className="playfield" aria-label="Intervalo actual">
        <DistanceGauge
          percentage={proximity.lastGuessDistancePercent}
          relation={lastGuess?.relation ?? null}
          showFriesCameo={showFriesCameo}
        />

        <div className="range-stack">
          <BoundRow
            key={`lower-${range.lower.rank}`}
            bound={range.lower}
            position="inferior"
            wordLength={game.dictionary.wordLength}
            animate={lastGuess?.relation === 'before'}
          />

          <GuessRow
            value={input}
            wordLength={game.dictionary.wordLength}
            disabled={!isPlaying}
            outsideRange={isInputOutsideRange}
            correct={game.status === 'won'}
            rejectionSequence={rejectionSequence}
            onChange={updateInput}
            onSubmit={handleSubmit}
          />

          <BoundRow
            key={`upper-${range.upper.rank}`}
            bound={range.upper}
            position="superior"
            wordLength={game.dictionary.wordLength}
            animate={lastGuess?.relation === 'after'}
          />
        </div>

        <GameTools
          mode={activeMode}
          authenticationStatus={privateAccess.authenticationStatus}
          stats={privateAccess.stats}
          themeControl={themeControl}
          onStartPractice={startPractice}
          onSignIn={privateAccess.signIn}
          onSignOut={privateAccess.signOut}
        />
      </section>

      <p
        id="game-notice"
        className="game-notice"
        data-tone={isInputOutsideRange ? 'alert' : 'default'}
        data-visible={displayedNotice.length > 0}
        role="status"
        aria-live="polite"
      >
        {displayedNotice}
      </p>

      <OnScreenKeyboard
        disabled={!isPlaying}
        allowedLetters={allowedLetters}
        onLetter={appendLetter}
        onDelete={deleteLetter}
        onSubmit={handleSubmit}
      />

      {game.status === 'playing' ? null : (
        <GameResultDialog
          open={resultOpen}
          status={game.status}
          answer={game.answer.display}
          attemptsUsed={attemptsUsed}
          onClose={() => setResultOpen(false)}
          onNextRound={activeMode === 'practice' ? startNextPracticeRound : undefined}
          shareResult={
            activeMode === 'daily' && dailyRound
              ? {
                  dateKey: dailyRound.dateKey,
                  status: game.status,
                  relations: game.guesses.map((guess) => guess.relation),
                  maxAttempts: game.maxAttempts,
                }
              : undefined
          }
        />
      )}
    </div>
  )
}

function AttemptDots({ used, total }: Readonly<{ used: number; total: number }>) {
  return (
    <div className="attempts" role="img" aria-label={`${used} de ${total} intentos usados`}>
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={`attempt-dot ${index < used ? 'attempt-dot-used' : ''}`}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

function BoundRow({
  bound,
  position,
  wordLength,
  animate,
}: Readonly<{
  bound: RangeBound
  position: 'inferior' | 'superior'
  wordLength: number
  animate: boolean
}>) {
  const letters = getBoundLetters(bound, wordLength)

  return (
    <div
      className={`letter-row bound-row ${animate ? `bound-row-updated bound-row-${position}` : ''}`}
      aria-label={`Límite ${position}: ${letters.join('')}`}
    >
      {letters.map((letter, index) => (
        <span className="letter-tile" key={`${letter}-${index}`} aria-hidden="true">
          <span className="bound-letter">{letter}</span>
        </span>
      ))}
    </div>
  )
}

function GuessRow({
  value,
  wordLength,
  disabled,
  outsideRange,
  correct,
  rejectionSequence,
  onChange,
  onSubmit,
}: Readonly<{
  value: string
  wordLength: number
  disabled: boolean
  outsideRange: boolean
  correct: boolean
  rejectionSequence: number
  onChange: (value: string) => void
  onSubmit: () => void
}>) {
  const letters = [...value.toLocaleUpperCase('es-CL')]

  return (
    <div className="guess-control">
      <label className="sr-only" htmlFor="guess">
        Palabra de cinco letras
      </label>
      <input
        id="guess"
        name="guess"
        type="text"
        value={value}
        maxLength={wordLength}
        autoComplete="off"
        autoCapitalize="characters"
        enterKeyHint="done"
        spellCheck={false}
        disabled={disabled}
        aria-invalid={outsideRange || undefined}
        aria-describedby="game-notice"
        className="native-guess-input"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return
          event.preventDefault()
          onSubmit()
        }}
      />
      <div
        key={rejectionSequence}
        className={`letter-row guess-row ${outsideRange ? 'guess-row-alert' : ''} ${correct ? 'guess-row-correct' : ''} ${rejectionSequence > 0 ? 'guess-row-rejected' : ''}`}
        aria-hidden="true"
      >
        {Array.from({ length: wordLength }, (_, index) => (
          <span
            className={`letter-tile ${index === letters.length && !disabled ? 'guess-caret' : ''} ${outsideRange && letters[index] ? 'letter-tile-alert' : ''}`}
            key={index}
          >
            {letters[index] ?? ''}
          </span>
        ))}
      </div>
    </div>
  )
}

function DistanceGauge({
  percentage,
  relation,
  showFriesCameo,
}: Readonly<{
  percentage: number | null
  relation: GuessRelation | null
  showFriesCameo: boolean
}>) {
  const marker =
    percentage === null || relation === null
      ? null
      : {
          label: formatDistancePercentage(percentage),
          position: getDistanceMarkerPosition(percentage, relation),
        }

  return (
    <aside className="distance-gauge" aria-label={getDistanceLabel(percentage)}>
      <span className="distance-track" aria-hidden="true" />
      {marker === null ? null : (
        <span className="distance-marker" style={{ top: `${marker.position}%` }}>
          {marker.label}
        </span>
      )}
      {!showFriesCameo || marker === null ? null : (
        <span className="fries-cameo">
          <FriesMascot />
        </span>
      )}
    </aside>
  )
}

function OnScreenKeyboard({
  disabled,
  allowedLetters,
  onLetter,
  onDelete,
  onSubmit,
}: Readonly<{
  disabled: boolean
  allowedLetters: readonly string[]
  onLetter: (letter: string) => void
  onDelete: () => void
  onSubmit: () => void
}>) {
  const allowedLetterSet = new Set(allowedLetters)

  return (
    <section className="keyboard" aria-label="Teclado">
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <div className="keyboard-row" key={row.join('')}>
          {rowIndex === KEYBOARD_ROWS.length - 1 ? (
            <button
              className="key key-action"
              type="button"
              aria-label="Borrar una letra"
              disabled={disabled}
              onClick={onDelete}
            >
              ←
            </button>
          ) : null}

          {row.map((letter) => {
            const isRangeBlocked =
              !disabled && !allowedLetterSet.has(letter.toLocaleLowerCase('es-CL'))

            return (
              <button
                className={`key ${isRangeBlocked ? 'key-range-blocked' : ''}`}
                type="button"
                aria-label={`Letra ${letter}${isRangeBlocked ? ', fuera del rango actual' : ''}`}
                disabled={disabled}
                onClick={() => onLetter(letter)}
                key={letter}
              >
                {letter}
              </button>
            )
          })}

          {rowIndex === KEYBOARD_ROWS.length - 1 ? (
            <button
              className="key key-action"
              type="button"
              aria-label="Probar"
              disabled={disabled}
              onClick={onSubmit}
            >
              ↵
            </button>
          ) : null}
        </div>
      ))}
    </section>
  )
}

function getBoundLetters(bound: RangeBound, wordLength: number): string[] {
  if (bound.kind === 'start') return Array.from({ length: wordLength }, () => 'A')
  if (bound.kind === 'end') return Array.from({ length: wordLength }, () => 'Z')
  return [...bound.display.toLocaleUpperCase('es-CL')]
}

function getAcceptedNotice(submission: Extract<SubmitGuessResult, { accepted: true }>): string {
  if (submission.state.status === 'won') return '¡Ganaste!'
  if (submission.state.status === 'lost') return `Era ${submission.state.answer.display}.`
  return ''
}

function getDistanceLabel(percentage: number | null): string {
  return percentage === null
    ? 'La distancia aparecerá después del primer intento válido.'
    : `Distancia: ${formatDistancePercentage(percentage)}`
}
