import AppDialog from '../../components/AppDialog'
import type { GameStatus } from '../../game/types'
import CowMascot from './CowMascot'

type GameResultDialogProps = Readonly<{
  open: boolean
  status: Exclude<GameStatus, 'playing'>
  answer: string
  attemptsUsed: number
  onClose: () => void
  onNextRound?: () => void
}>

export default function GameResultDialog({
  open,
  status,
  answer,
  attemptsUsed,
  onClose,
  onNextRound,
}: GameResultDialogProps) {
  return (
    <AppDialog
      open={open}
      title={status === 'won' ? 'Ganaste' : 'La palabra era'}
      onClose={onClose}
    >
      {open ? <CowMascot mood={status === 'won' ? 'victory' : 'defeat'} /> : null}
      <p className="result-word">{answer.toLocaleUpperCase('es-CL')}</p>
      <p className="result-attempts">
        {attemptsUsed} {attemptsUsed === 1 ? 'intento' : 'intentos'}
      </p>
      {onNextRound ? (
        <div className="dialog-actions">
          <button className="dialog-action" type="button" onClick={onNextRound}>
            Otra palabra
          </button>
        </div>
      ) : null}
    </AppDialog>
  )
}
