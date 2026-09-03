import { ChartBar, SealQuestion } from '@phosphor-icons/react'
import { useState } from 'react'
import type { ReactNode } from 'react'

import AppDialog from '../../components/AppDialog'
import type { GameStatus } from '../../game/types'

type OpenPanel = 'help' | 'stats' | null

type GameToolsProps = Readonly<{
  status: GameStatus
  attemptsUsed: number
  maxAttempts: number
  candidateCount: number
  themeControl: ReactNode
}>

export default function GameTools({
  status,
  attemptsUsed,
  maxAttempts,
  candidateCount,
  themeControl,
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
          aria-label="Estadísticas de hoy"
          onClick={() => setOpenPanel('stats')}
        >
          <ChartBar size={22} weight="regular" aria-hidden="true" />
        </button>

        {themeControl}
      </nav>

      <AppDialog open={openPanel === 'help'} title="Cómo jugar" onClose={() => setOpenPanel(null)}>
        <ol className="help-steps">
          <li>Escribe una palabra de cinco letras.</li>
          <li>La respuesta está entre ambos límites según el orden alfabético.</li>
          <li>
            Cada intento ajusta el intervalo. Mientras menor sea el porcentaje, más cerca estás.
          </li>
        </ol>
      </AppDialog>

      <AppDialog open={openPanel === 'stats'} title="Hoy" onClose={() => setOpenPanel(null)}>
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
