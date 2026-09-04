import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'

import { submitGuess } from '../../game/engine'
import { createGameSession } from '../../game/game-data'
import {
  getAllowedNextLetters,
  getAttemptsUsed,
  getRangeProximity,
  getRemainingRange,
  isInputPrefixWithinRange,
} from '../../game/selectors'
import type { GuessRejectionReason, RangeBound, SubmitGuessResult } from '../../game/types'
import { formatDistancePercentage, getDistanceMarkerPosition } from './distance-display'
import GameResultDialog from './GameResultDialog'
import GameTools from './GameTools'

type DailyGameProps = Readonly<{
  now?: Date
  themeControl: ReactNode
}>

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

const CORRECT_RESULT_DELAY_MS = 760

export default function DailyGame({ now = new Date(), themeControl }: DailyGameProps) {
  const [session] = useState(() => createGameSession(now))
  const [game, setGame] = useState(session.game)
  const [input, setInput] = useState('')
  const [notice, setNotice] = useState('')
  const [resultOpen, setResultOpen] = useState(false)
  const [rejectionSequence, setRejectionSequence] = useState(0)
  const resultDelayRef = useRef<number | undefined>(undefined)
  const range = getRemainingRange(game)
  const proximity = getRangeProximity(game)
  const attemptsUsed = getAttemptsUsed(game)
  const lastGuess = game.guesses[game.guesses.length - 1]
  const isPlaying = game.status === 'playing'
  const allowedLetters = getAllowedNextLetters(game, input)
  const isInputOutsideRange = !isInputPrefixWithinRange(game, input)
  const displayedNotice = isInputOutsideRange ? 'Palabra fuera de rango' : notice

  useEffect(
    () => () => {
      if (resultDelayRef.current !== undefined) {
        window.clearTimeout(resultDelayRef.current)
      }
    },
    [],
  )

  function updateInput(value: string) {
    setInput([...value].slice(0, game.dictionary.wordLength).join(''))
    setNotice('')
  }

  function appendLetter(letter: string) {
    if (!isPlaying || [...input].length >= game.dictionary.wordLength) return

    updateInput(`${input}${letter.toLocaleLowerCase('es-CL')}`)
  }

  function deleteLetter() {
    updateInput([...input].slice(0, -1).join(''))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const submission = submitGuess(game, input)

    if (!submission.accepted) {
      setNotice(REJECTION_MESSAGES[submission.reason])
      setRejectionSequence((current) => current + 1)
      return
    }

    const didWin = submission.state.status === 'won'

    setGame(submission.state)
    setInput(didWin ? input : '')
    setNotice(getAcceptedNotice(submission))

    if (didWin && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      resultDelayRef.current = window.setTimeout(() => {
        setResultOpen(true)
        resultDelayRef.current = undefined
      }, CORRECT_RESULT_DELAY_MS)
      return
    }

    setResultOpen(submission.state.status !== 'playing')
  }

  return (
    <form className="game-form" onSubmit={handleSubmit}>
      <AttemptDots used={attemptsUsed} total={game.maxAttempts} />

      <section className="playfield" aria-label="Intervalo actual">
        <DistanceGauge percentage={proximity.lastGuessDistancePercent} />

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
          status={game.status}
          attemptsUsed={attemptsUsed}
          maxAttempts={game.maxAttempts}
          candidateCount={range.candidateCount}
          themeControl={themeControl}
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
      />

      {game.status === 'playing' ? null : (
        <GameResultDialog
          open={resultOpen}
          status={game.status}
          answer={game.answer.display}
          attemptsUsed={attemptsUsed}
          onClose={() => setResultOpen(false)}
        />
      )}
    </form>
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
}: Readonly<{
  value: string
  wordLength: number
  disabled: boolean
  outsideRange: boolean
  correct: boolean
  rejectionSequence: number
  onChange: (value: string) => void
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

function DistanceGauge({ percentage }: Readonly<{ percentage: number | null }>) {
  return (
    <aside className="distance-gauge" aria-label={getDistanceLabel(percentage)}>
      <span className="distance-track" aria-hidden="true" />
      {percentage === null ? null : (
        <span
          className="distance-marker"
          style={{ top: `${getDistanceMarkerPosition(percentage)}%` }}
        >
          {formatDistancePercentage(percentage)}
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
}: Readonly<{
  disabled: boolean
  allowedLetters: readonly string[]
  onLetter: (letter: string) => void
  onDelete: () => void
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
              type="submit"
              aria-label="Probar"
              disabled={disabled}
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
