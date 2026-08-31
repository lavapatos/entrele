import { useState } from 'react'
import type { FormEvent } from 'react'

import { DAILY_TIME_ZONE } from '../../game/constants'
import { submitGuess } from '../../game/engine'
import { PROTOTYPE_DICTIONARY, createPrototypeSession } from '../../game/prototype-data'
import {
  getAttemptsRemaining,
  getAttemptsUsed,
  getGameResult,
  getLastGuess,
  getRemainingRange,
} from '../../game/selectors'
import type { Guess, GuessRejectionReason, SubmitGuessResult } from '../../game/types'

type PrototypeGameProps = Readonly<{
  now?: Date
}>

const REJECTION_MESSAGES: Record<GuessRejectionReason, string> = {
  empty: 'Escribe una palabra.',
  'invalid-characters': 'Usa solo letras, sin espacios interiores ni símbolos.',
  'wrong-length': 'La palabra debe tener cinco letras.',
  'unknown-word': 'Esa palabra no está en el mini diccionario de prueba.',
  duplicate: 'Esa palabra ya fue usada. No perdiste un intento.',
  'outside-range': 'Esa palabra ya quedó fuera del intervalo. No perdiste un intento.',
  'game-over': 'La partida ya terminó.',
}

export default function PrototypeGame({ now = new Date() }: PrototypeGameProps) {
  const [session] = useState(() => createPrototypeSession(now))
  const [game, setGame] = useState(session.game)
  const [input, setInput] = useState('')
  const [notice, setNotice] = useState(
    'Escribe una palabra del mini diccionario para cerrar el intervalo.',
  )
  const range = getRemainingRange(game)
  const lastGuess = getLastGuess(game)
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

      <section className="border-b border-stone-300 py-6" aria-labelledby="comparison-title">
        <h3 id="comparison-title" className="text-base font-semibold">
          Dos lecturas provisionales de cercanía
        </h3>
        <p className="mt-1 text-sm text-stone-600">
          Ambas funcionan; elegiremos una después de probar la mecánica.
        </p>

        <dl className="mt-4 divide-y divide-stone-200 border-y border-stone-200">
          <Metric
            label="A · Tamaño del intervalo"
            value={getRemainingWordsCopy(range.candidateCount, game.status)}
          />
          <Metric label="B · Distancia del último intento" value={getDistanceCopy(lastGuess)} />
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
                <span className="text-right text-stone-600">{getRelationCopy(guess)}</span>
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

      <details className="py-6 text-sm">
        <summary className="cursor-pointer font-medium">Ver mini diccionario técnico</summary>
        <p className="mt-3 leading-7 text-stone-600">
          {PROTOTYPE_DICTIONARY.entries.map((entry) => entry.display).join(', ')}.
        </p>
        <p className="mt-2 text-stone-500">
          Este listado solo permite probar el motor; no es el diccionario de ENTRELE.
        </p>
      </details>
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

function getRemainingWordsCopy(candidateCount: number, status: GameStateStatus): string {
  if (status === 'won') {
    return 'Respuesta encontrada.'
  }

  return `Quedan ${candidateCount} ${candidateCount === 1 ? 'palabra posible' : 'palabras posibles'}.`
}

type GameStateStatus = ReturnType<typeof getGameResult>['status']

function getDistanceCopy(lastGuess: Guess | null): string {
  if (!lastGuess) {
    return 'Aparece después del primer intento válido.'
  }

  if (lastGuess.relation === 'equal') {
    return 'Distancia cero: respuesta encontrada.'
  }

  const count = lastGuess.wordsBetweenAnswer
  return `Hay ${count} ${count === 1 ? 'palabra' : 'palabras'} entre ${lastGuess.display} y la respuesta.`
}

function getRelationCopy(guess: Guess): string {
  if (guess.relation === 'equal') {
    return 'respuesta correcta'
  }

  return guess.relation === 'before' ? 'la respuesta va después' : 'la respuesta va antes'
}
