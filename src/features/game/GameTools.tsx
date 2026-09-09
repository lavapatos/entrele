import { ChartBar, SealQuestion } from '@phosphor-icons/react'
import { useState } from 'react'
import type { ReactNode } from 'react'

import AppDialog from '../../components/AppDialog'
import { getWinRate } from '../../game/stats'
import type { GameStats } from '../../game/stats'
import CowMascot from './CowMascot'
import HelpDemo from './HelpDemo'

type OpenPanel = 'help' | 'stats' | null

type GameToolsProps = Readonly<{
  mode: 'daily' | 'practice'
  stats: GameStats
  themeControl: ReactNode
  onStartPractice: () => void
}>

export default function GameTools({ mode, stats, themeControl, onStartPractice }: GameToolsProps) {
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null)

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

        <button
          className="tool-button"
          type="button"
          aria-label="Estadísticas"
          onClick={() => setOpenPanel('stats')}
        >
          <ChartBar size={22} weight="regular" aria-hidden="true" />
        </button>

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

      <AppDialog
        open={openPanel === 'stats'}
        title="Estadísticas"
        onClose={() => setOpenPanel(null)}
      >
        <StatsSummary stats={stats} />
      </AppDialog>
    </>
  )
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
          <div key={label} aria-label={`${label}: ${value}`}>
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
