import AppDialog from '../../components/AppDialog'
import type { GameStatus } from '../../game/types'

type GameResultDialogProps = Readonly<{
  open: boolean
  status: Exclude<GameStatus, 'playing'>
  answer: string
  attemptsUsed: number
  onClose: () => void
}>

export default function GameResultDialog({
  open,
  status,
  answer,
  attemptsUsed,
  onClose,
}: GameResultDialogProps) {
  return (
    <AppDialog
      open={open}
      title={status === 'won' ? 'Ganaste' : 'La palabra era'}
      onClose={onClose}
    >
      <p className="result-word">{answer.toLocaleUpperCase('es-CL')}</p>
      <p className="result-attempts">
        {attemptsUsed} {attemptsUsed === 1 ? 'intento' : 'intentos'}
      </p>
    </AppDialog>
  )
}
