import { ChartBar } from '@phosphor-icons/react/ChartBar'
import { Key } from '@phosphor-icons/react/Key'
import { SealQuestion } from '@phosphor-icons/react/SealQuestion'
import { useId, useState } from 'react'
import type { ReactNode } from 'react'

import AppDialog from '../../components/AppDialog'
import { getWinRate } from '../../game/stats'
import type { GameStats } from '../../game/stats'
import { PrivateAccessError } from '../../private-access/types'
import type { AuthenticationStatus } from '../../private-access/use-private-game-access'
import CowMascot from './CowMascot'
import HelpDemo from './HelpDemo'

type OpenPanel = 'access' | 'help' | 'stats' | null

type GameToolsProps = Readonly<{
  mode: 'daily' | 'practice'
  authenticationStatus: AuthenticationStatus
  stats: GameStats
  themeControl: ReactNode
  onStartPractice: () => void
  onSignIn: (username: string, password: string) => Promise<void>
  onSignOut: () => Promise<void>
}>

export default function GameTools({
  mode,
  authenticationStatus,
  stats,
  themeControl,
  onStartPractice,
  onSignIn,
  onSignOut,
}: GameToolsProps) {
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null)
  const [signOutError, setSignOutError] = useState('')
  const isSignedIn = authenticationStatus === 'signed-in'

  return (
    <>
      <nav className="game-tools" aria-label="Opciones de la partida">
        <button
          className="tool-button"
          type="button"
          aria-label="Cómo jugar"
          onClick={() => setOpenPanel('help')}
        >
          <SealQuestion size={22} weight="regular" aria-hidden="true" />
        </button>

        {isSignedIn ? (
          <button
            className="tool-button"
            type="button"
            aria-label="Estadísticas"
            onClick={() => {
              setSignOutError('')
              setOpenPanel('stats')
            }}
          >
            <ChartBar size={22} weight="regular" aria-hidden="true" />
          </button>
        ) : (
          <button
            className="tool-button"
            type="button"
            aria-label={authenticationStatus === 'checking' ? 'Comprobando acceso' : 'Entrar'}
            disabled={authenticationStatus === 'checking'}
            onClick={() => setOpenPanel('access')}
          >
            <Key size={22} weight="regular" aria-hidden="true" />
          </button>
        )}

        {themeControl}
      </nav>

      <AppDialog open={openPanel === 'help'} title="Cómo jugar" onClose={() => setOpenPanel(null)}>
        {openPanel === 'help' ? (
          <div className="help-visual">
            <CowMascot mood="neutral" />
            <HelpDemo />
          </div>
        ) : null}
        <ol className="help-steps">
          <li>Escribe una palabra de cinco letras.</li>
          <li>La respuesta está entre ambos límites según el orden alfabético.</li>
          <li>
            Cada intento ajusta el intervalo. Mientras menor sea el porcentaje, más cerca estás.
          </li>
        </ol>
        {mode === 'daily' ? (
          <div className="dialog-actions">
            <button
              className="dialog-action"
              type="button"
              onClick={() => {
                setOpenPanel(null)
                onStartPractice()
              }}
            >
              Practicar
            </button>
          </div>
        ) : null}
      </AppDialog>

      <AppDialog open={openPanel === 'access'} title="Entrar" onClose={() => setOpenPanel(null)}>
        {openPanel === 'access' ? (
          <AccessForm
            onSignIn={onSignIn}
            onSuccess={() => {
              setOpenPanel(null)
            }}
          />
        ) : null}
      </AppDialog>

      <AppDialog
        open={openPanel === 'stats'}
        title="Estadísticas"
        onClose={() => setOpenPanel(null)}
      >
        <StatsSummary stats={stats} />
        <div className="dialog-actions">
          <button
            className="dialog-secondary-action"
            type="button"
            onClick={() => {
              setSignOutError('')
              void onSignOut()
                .then(() => setOpenPanel(null))
                .catch(() => setSignOutError('No pudimos cerrar la sesión.'))
            }}
          >
            Cerrar sesión
          </button>
        </div>
        <p className="access-error" role="status" aria-live="polite">
          {signOutError}
        </p>
      </AppDialog>
    </>
  )
}

function AccessForm({
  onSignIn,
  onSuccess,
}: Readonly<{
  onSignIn: (username: string, password: string) => Promise<void>
  onSuccess: () => void
}>) {
  const usernameId = useId()
  const passwordId = useId()
  const errorId = useId()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  return (
    <form
      className="access-form"
      onSubmit={(event) => {
        event.preventDefault()
        setBusy(true)
        setErrorMessage('')

        void onSignIn(username, password)
          .then(onSuccess)
          .catch((error: unknown) => setErrorMessage(getSignInErrorMessage(error)))
          .finally(() => setBusy(false))
      }}
    >
      <label htmlFor={usernameId}>Usuario</label>
      <input
        id={usernameId}
        name="username"
        type="text"
        value={username}
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        disabled={busy}
        aria-describedby={errorMessage ? errorId : undefined}
        onChange={(event) => setUsername(event.target.value)}
      />

      <label htmlFor={passwordId}>Contraseña</label>
      <input
        id={passwordId}
        name="password"
        type="password"
        value={password}
        autoComplete="current-password"
        disabled={busy}
        aria-describedby={errorMessage ? errorId : undefined}
        onChange={(event) => setPassword(event.target.value)}
      />

      <p id={errorId} className="access-error" role="alert" aria-live="polite">
        {errorMessage}
      </p>

      <div className="dialog-actions">
        <button
          className="dialog-action"
          type="submit"
          disabled={busy || !username.trim() || !password}
        >
          Entrar
        </button>
      </div>
    </form>
  )
}

function getSignInErrorMessage(error: unknown): string {
  if (!(error instanceof PrivateAccessError)) return 'No pudimos iniciar sesión.'

  switch (error.reason) {
    case 'invalid-credentials':
      return 'Usuario o contraseña incorrectos.'
    case 'offline':
      return 'Necesitas conexión para entrar.'
    case 'not-configured':
      return 'El acceso todavía no está disponible.'
    default:
      return 'No pudimos iniciar sesión.'
  }
}

function StatsSummary({ stats }: Readonly<{ stats: GameStats }>) {
  const summary = [
    ['Jugadas', stats.played],
    ['Ganadas', stats.wins],
    ['Acierto', `${getWinRate(stats)}%`],
    ['Racha', stats.currentStreak],
    ['Mejor', stats.bestStreak],
  ] as const
  const largestBucket = Math.max(1, ...stats.attemptDistribution)
  const distributionLabel = stats.attemptDistribution
    .map((count, index) => `${index + 1} intentos: ${count}`)
    .join(', ')

  return (
    <>
      <dl className="historical-stats">
        {summary.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <section className="attempt-distribution" aria-labelledby="attempt-distribution-title">
        <h3 id="attempt-distribution-title">Intentos</h3>
        <div
          className="attempt-distribution-plot"
          role="img"
          aria-label={`Distribución de victorias por intentos. ${distributionLabel}`}
        >
          {stats.attemptDistribution.map((count, index) => (
            <div className="attempt-distribution-row" key={index} aria-hidden="true">
              <span>{index + 1}</span>
              <span className="attempt-distribution-space">
                <span
                  className="attempt-distribution-bar"
                  style={{ width: `${(count / largestBucket) * 100}%` }}
                />
              </span>
              <span>{count}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
