import { useState } from 'react'
import type { FormEvent } from 'react'

import { submitGuess } from '../../game/engine'
import { createGameSession } from '../../game/game-data'
import { getAttemptsUsed, getRangeProximity, getRemainingRange } from '../../game/selectors'
import type { GuessRejectionReason, RangeBound, SubmitGuessResult } from '../../game/types'

type DailyGameProps = Readonly<{
  now?: Date
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
  'outside-range': 'Quedó fuera del intervalo.',
  'game-over': 'La partida terminó.',
}

export default function DailyGame({ now = new Date() }: DailyGameProps) {
  const [session] = useState(() => createGameSession(now))
  const [game, setGame] = useState(session.game)
  const [input, setInput] = useState('')
  const [notice, setNotice] = useState('')
  const range = getRemainingRange(game)
  const proximity = getRangeProximity(game)
  const attemptsUsed = getAttemptsUsed(game)
  const isPlaying = game.status === 'playing'

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
      return
    }

    setGame(submission.state)
    setInput('')
    setNotice(getAcceptedNotice(submission))
  }

  return (
    <form className="game-form" onSubmit={handleSubmit}>
      <AttemptDots used={attemptsUsed} total={game.maxAttempts} />

      <section className="playfield" aria-label="Intervalo actual">
        <DistanceGauge percentage={proximity.lastGuessDistancePercent} />

        <div className="range-stack">
          <BoundRow
            bound={range.lower}
            position="inferior"
            wordLength={game.dictionary.wordLength}
          />

          <GuessRow
            value={input}
            wordLength={game.dictionary.wordLength}
            disabled={!isPlaying}
            onChange={updateInput}
          />

          <BoundRow
            bound={range.upper}
            position="superior"
            wordLength={game.dictionary.wordLength}
          />
        </div>
      </section>

      <p
        id="game-notice"
        className="game-notice"
        data-visible={notice.length > 0}
        role="status"
        aria-live="polite"
      >
        {notice}
      </p>

      <OnScreenKeyboard disabled={!isPlaying} onLetter={appendLetter} onDelete={deleteLetter} />
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
}: Readonly<{
  bound: RangeBound
  position: 'inferior' | 'superior'
  wordLength: number
}>) {
  const letters = getBoundLetters(bound, wordLength)

  return (
    <div className="letter-row bound-row" aria-label={`Límite ${position}: ${letters.join('')}`}>
      {letters.map((letter, index) => (
        <span className="letter-tile" key={`${letter}-${index}`} aria-hidden="true">
          {letter}
        </span>
      ))}
    </div>
  )
}

function GuessRow({
  value,
  wordLength,
  disabled,
  onChange,
}: Readonly<{
  value: string
  wordLength: number
  disabled: boolean
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
        aria-describedby="game-notice"
        className="native-guess-input"
        onChange={(event) => onChange(event.target.value)}
      />
      <div className="letter-row guess-row" aria-hidden="true">
        {Array.from({ length: wordLength }, (_, index) => (
          <span
            className={`letter-tile ${index === letters.length && !disabled ? 'guess-caret' : ''}`}
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
        <span className="distance-marker" style={{ top: `${getMarkerPosition(percentage)}%` }}>
          {formatPercentage(percentage)}
        </span>
      )}
    </aside>
  )
}

function OnScreenKeyboard({
  disabled,
  onLetter,
  onDelete,
}: Readonly<{
  disabled: boolean
  onLetter: (letter: string) => void
  onDelete: () => void
}>) {
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

          {row.map((letter) => (
            <button
              className="key"
              type="button"
              aria-label={`Letra ${letter}`}
              disabled={disabled}
              onClick={() => onLetter(letter)}
              key={letter}
            >
              {letter}
            </button>
          ))}

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

function getMarkerPosition(percentage: number): number {
  const boundedPercentage = Math.max(0, Math.min(100, percentage))
  return 14 + (1 - boundedPercentage / 100) * 72
}

function getDistanceLabel(percentage: number | null): string {
  return percentage === null
    ? 'La distancia aparecerá después del primer intento válido.'
    : `Distancia: ${formatPercentage(percentage)}`
}

function formatPercentage(percentage: number): string {
  if (percentage > 0 && percentage < 1) return '<1%'
  return `${Math.round(percentage)}%`
}
