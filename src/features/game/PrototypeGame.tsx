import { useState } from 'react'
import type { FormEvent } from 'react'

import { DAILY_TIME_ZONE } from '../../game/constants'
import { getDistancePercent } from '../../game/compare'
import { submitGuess } from '../../game/engine'
import { DICTIONARY_VERSION, GAME_DICTIONARY, createGameSession } from '../../game/game-data'
import {
  getAttemptsRemaining,
  getAttemptsUsed,
  getGameResult,
  getRangeProximity,
  getRemainingRange,
} from '../../game/selectors'
import type {
  GameStatus,
  Guess,
  GuessRejectionReason,
  RangeProximity,
  RemainingRange,
  SubmitGuessResult,
} from '../../game/types'

type PrototypeGameProps = Readonly<{
  now?: Date
}>

const REJECTION_MESSAGES: Record<GuessRejectionReason, string> = {
  empty: 'Escribe una palabra.',
  'invalid-characters': 'Usa solo letras, sin espacios interiores ni símbolos.',
  'wrong-length': 'La palabra debe tener cinco letras.',
  'unknown-word': 'Esa palabra no está en el diccionario.',
  duplicate: 'Esa palabra ya fue usada. No perdiste un intento.',
  'outside-range': 'Esa palabra ya quedó fuera del intervalo. No perdiste un intento.',
  'game-over': 'La partida ya terminó.',
}

export default function PrototypeGame({ now = new Date() }: PrototypeGameProps) {
  const [session] = useState(() => createGameSession(now))
  const [game, setGame] = useState(session.game)
  const [input, setInput] = useState('')
  const [notice, setNotice] = useState('Escribe una palabra para cerrar el intervalo.')
  const range = getRemainingRange(game)
  const proximity = getRangeProximity(game)
  const result = getGameResult(game)
  const isPlaying = game.status === 'playing'

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const submission = submitGuess(game, input)

    if (!submission.accepted) {
      setNotice(REJECTION_MESSAGES[submission.reason])
      return
    }

    setGame(submission.state)
    setInput('')
    setNotice(getAcceptedMessage(submission))
  }

  return (
    <section aria-labelledby="prototype-title">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-stone-300 pb-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-stone-500">
            Motor sin diseño final
          </p>
          <h2 id="prototype-title" className="mt-1 text-xl font-semibold">
            Partida técnica
          </h2>
        </div>
        <p className="text-sm text-stone-600">
          {session.dateKey} · {DAILY_TIME_ZONE}
        </p>
      </div>

      <div className="grid grid-cols-2 border-b border-stone-300" aria-label="Intervalo actual">
        <Bound label="Desde" value={range.lower.display} />
        <Bound label="Hasta" value={range.upper.display} divided />
      </div>

      <div className="py-5">
        <p className="text-sm font-medium">
          Intentos: {getAttemptsUsed(game)} de {game.maxAttempts}
        </p>
        <p className="mt-1 text-sm text-stone-600">Quedan {getAttemptsRemaining(game)} intentos.</p>
      </div>

      <form className="border-y border-stone-300 py-5" onSubmit={handleSubmit}>
        <label htmlFor="guess" className="block text-sm font-medium">
          Palabra de cinco letras
        </label>
        <p id="guess-help" className="mt-1 text-sm text-stone-600">
          Las tildes son opcionales; la ñ sigue siendo distinta de la n.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            id="guess"
            name="guess"
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            aria-describedby="guess-help"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck="false"
            disabled={!isPlaying}
            className="min-w-0 flex-1 border border-stone-400 bg-white px-3 py-2 text-base outline-none focus:border-stone-950 disabled:bg-stone-100 disabled:text-stone-500"
          />
          <button
            type="submit"
            disabled={!isPlaying}
            className="border border-stone-950 bg-stone-950 px-5 py-2 text-sm font-medium text-white disabled:border-stone-300 disabled:bg-stone-300 disabled:text-stone-600"
          >
            Probar
          </button>
        </div>
      </form>

      <p
        className="min-h-16 border-b border-stone-300 py-5 text-sm"
        role="status"
        aria-live="polite"
      >
        {notice}
      </p>

      <section className="border-b border-stone-300 py-6" aria-labelledby="proximity-title">
        <h3 id="proximity-title" className="text-base font-semibold">
          Distancia porcentual
        </h3>
        <p className="mt-1 text-sm text-stone-600">
          Se calcula por posición alfabética sobre el diccionario completo, no por significado.
        </p>

        <dl className="mt-4 divide-y divide-stone-200 border-y border-stone-200">
          <Metric
            label="Último intento"
            value={getDistanceCopy(proximity.lastGuessDistancePercent, game.status)}
          />
          <Metric
            label="Límite más cercano"
            value={getCloserBoundCopy(proximity.closerBound, range, game.status)}
          />
        </dl>
      </section>

      {game.guesses.length > 0 ? (
        <section className="border-b border-stone-300 py-6" aria-labelledby="guesses-title">
          <h3 id="guesses-title" className="text-base font-semibold">
            Intentos válidos
          </h3>
          <ol className="mt-3 divide-y divide-stone-200 border-y border-stone-200">
            {game.guesses.map((guess) => (
              <li key={guess.inputKey} className="flex justify-between gap-4 py-3 text-sm">
                <span className="font-medium">{guess.display}</span>
                <span className="text-right text-stone-600">
                  {getGuessFeedbackCopy(guess, game.dictionary.entries.length)}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {result.status !== 'playing' ? (
        <p className="border-b border-stone-300 py-6 text-sm font-medium">
          {result.status === 'won'
            ? `Partida resuelta en ${result.attemptsUsed} intentos.`
            : `Sin intentos. La palabra era ${result.answer}.`}
        </p>
      ) : null}

      <p className="py-6 text-sm text-stone-500">
        Diccionario {DICTIONARY_VERSION} · {GAME_DICTIONARY.entries.length.toLocaleString('es-CL')}{' '}
        palabras aceptadas.
      </p>
    </section>
  )
}

function Bound({
  label,
  value,
  divided = false,
}: Readonly<{ label: string; value: string; divided?: boolean }>) {
  return (
    <div className={`py-5 ${divided ? 'border-l border-stone-300 pl-5' : 'pr-5'}`}>
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold uppercase tracking-wide">{value}</p>
    </div>
  )
}

function Metric({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[13rem_1fr] sm:gap-4">
      <dt className="text-sm font-medium">{label}</dt>
      <dd className="text-sm text-stone-600">{value}</dd>
    </div>
  )
}

function getAcceptedMessage(submission: Extract<SubmitGuessResult, { accepted: true }>): string {
  if (submission.guess.relation === 'equal') {
    return `Encontraste ${submission.guess.display}.`
  }

  if (submission.state.status === 'lost') {
    return `Se acabaron los intentos. La palabra era ${submission.state.answer.display}.`
  }

  return `La respuesta está ${submission.guess.relation === 'before' ? 'después' : 'antes'} de ${submission.guess.display}.`
}

function getDistanceCopy(distancePercent: number | null, status: GameStatus): string {
  if (distancePercent === null) {
    return 'Aparece después del primer intento válido.'
  }

  if (status === 'won') {
    return 'Distancia cero: respuesta encontrada.'
  }

  return `La distancia equivale a ${formatDistancePercent(distancePercent)} del diccionario completo.`
}

function getCloserBoundCopy(
  closerBound: RangeProximity['closerBound'],
  range: RemainingRange,
  status: GameStatus,
): string {
  if (status === 'won') {
    return 'Respuesta encontrada.'
  }

  if (closerBound === null) {
    return 'Aparece después del primer intento válido.'
  }

  if (closerBound === 'tie') {
    return 'La respuesta está a igual distancia de ambos límites.'
  }

  const bound = closerBound === 'lower' ? range.lower : range.upper
  const label = closerBound === 'lower' ? 'inferior' : 'superior'
  return `La respuesta está más cerca de ${bound.display}, el límite ${label}.`
}

function getGuessFeedbackCopy(guess: Guess, dictionarySize: number): string {
  if (guess.relation === 'equal') {
    return 'respuesta correcta'
  }

  const relation = guess.relation === 'before' ? 'va después' : 'va antes'
  const distance = formatDistancePercent(getDistancePercent(guess.rankDistance, dictionarySize))
  return `${relation} · distancia ${distance}`
}

function formatDistancePercent(value: number): string {
  if (value > 0 && value < 1) {
    return '<1%'
  }

  return `${Math.round(value)}%`
}
