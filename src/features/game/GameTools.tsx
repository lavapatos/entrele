import { ChartBar, SealQuestion, X } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

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

      <GameDialog open={openPanel === 'help'} title="Cómo jugar" onClose={() => setOpenPanel(null)}>
        <ol className="help-steps">
          <li>Escribe una palabra de cinco letras.</li>
          <li>Cada intento válido mueve uno de los dos límites.</li>
          <li>Mientras menor sea el porcentaje, más cerca estás.</li>
        </ol>
      </GameDialog>

      <GameDialog open={openPanel === 'stats'} title="Hoy" onClose={() => setOpenPanel(null)}>
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
      </GameDialog>
    </>
  )
}

function GameDialog({
  open,
  title,
  onClose,
  children,
}: Readonly<{
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}>) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal()
      else dialog.setAttribute('open', '')
    }

    if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close()
      else dialog.removeAttribute('open')
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className="game-dialog"
      aria-labelledby={`dialog-title-${title.toLocaleLowerCase('es-CL').replaceAll(' ', '-')}`}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClose={onClose}
    >
      <div className="dialog-heading">
        <h2 id={`dialog-title-${title.toLocaleLowerCase('es-CL').replaceAll(' ', '-')}`}>
          {title}
        </h2>
        <button className="dialog-close" type="button" aria-label="Cerrar" onClick={onClose}>
          <X size={20} weight="regular" aria-hidden="true" />
        </button>
      </div>
      {children}
    </dialog>
  )
}

function getStatusLabel(status: GameStatus): string {
  if (status === 'won') return 'Ganaste'
  if (status === 'lost') return 'Terminó'
  return 'En juego'
}
