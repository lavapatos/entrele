import { ChartBar, SealQuestion } from '@phosphor-icons/react'
import { useState } from 'react'
import type { ReactNode } from 'react'

import AppDialog from '../../components/AppDialog'
import type { GameStatus } from '../../game/types'
import CowMascot from './CowMascot'
import HelpDemo from './HelpDemo'

type OpenPanel = 'help' | 'stats' | null

type GameToolsProps = Readonly<{
  mode: 'daily' | 'practice'
  status: GameStatus
  attemptsUsed: number
  maxAttempts: number
  candidateCount: number
  themeControl: ReactNode
  onStartPractice: () => void
}>

export default function GameTools({
  mode,
  status,
  attemptsUsed,
  maxAttempts,
  candidateCount,
  themeControl,
  onStartPractice,
}: GameToolsProps) {
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
          aria-label={mode === 'daily' ? 'Estadísticas de hoy' : 'Estado de la práctica'}
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
        title={mode === 'daily' ? 'Hoy' : 'Práctica'}
        onClose={() => setOpenPanel(null)}
      >
        <p className="session-status">{getStatusLabel(status)}</p>
        <dl className="session-stats">
          <div aria-label={`Intentos usados: ${attemptsUsed}`}>
            <dt>Usados</dt>
            <dd>{attemptsUsed}</dd>
          </div>
          <div aria-label={`Intentos disponibles: ${maxAttempts - attemptsUsed}`}>
            <dt>Disponibles</dt>
            <dd>{maxAttempts - attemptsUsed}</dd>
          </div>
          <div aria-label={`Palabras candidatas: ${candidateCount}`}>
            <dt>Candidatas</dt>
            <dd>{candidateCount}</dd>
          </div>
        </dl>
      </AppDialog>
    </>
  )
}

function getStatusLabel(status: GameStatus): string {
  if (status === 'won') return 'Ganaste'
  if (status === 'lost') return 'Terminó'
  return 'En juego'
}
