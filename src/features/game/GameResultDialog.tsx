import { useState } from 'react'

import AppDialog from '../../components/AppDialog'
import type { GameStatus } from '../../game/types'
import { formatShareResult } from '../share/share-result'
import type { ShareResultData } from '../share/share-result'
import CowMascot from './CowMascot'

type GameResultDialogProps = Readonly<{
  open: boolean
  status: Exclude<GameStatus, 'playing'>
  answer: string
  attemptsUsed: number
  onClose: () => void
  onNextRound?: () => void
  shareResult?: ShareResultData
}>

export default function GameResultDialog({
  open,
  status,
  answer,
  attemptsUsed,
  onClose,
  onNextRound,
  shareResult,
}: GameResultDialogProps) {
  const [shareStatus, setShareStatus] = useState('')
  const [sharing, setSharing] = useState(false)

  function closeDialog() {
    setShareStatus('')
    onClose()
  }

  function startNextRound() {
    setShareStatus('')
    onNextRound?.()
  }

  async function shareDailyResult() {
    if (!shareResult || sharing) return

    const text = formatShareResult({ ...shareResult, url: getPublicShareUrl() })
    setSharing(true)
    setShareStatus('')

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'ENTRELE', text })
        setSharing(false)
        return
      } catch (error) {
        if (isShareCancellation(error)) {
          setSharing(false)
          return
        }
      }
    }

    try {
      await navigator.clipboard.writeText(text)
      setShareStatus('Resultado copiado.')
    } catch {
      setShareStatus('No se pudo compartir.')
    } finally {
      setSharing(false)
    }
  }

  return (
    <AppDialog
      open={open}
      title={status === 'won' ? 'Ganaste' : 'La palabra era'}
      onClose={closeDialog}
    >
      {open ? <CowMascot mood={status === 'won' ? 'victory' : 'defeat'} /> : null}
      <p className="result-word">{answer.toLocaleUpperCase('es-CL')}</p>
      <p className="result-attempts">
        {attemptsUsed} {attemptsUsed === 1 ? 'intento' : 'intentos'}
      </p>
      {onNextRound ? (
        <div className="dialog-actions">
          <button className="dialog-action" type="button" onClick={startNextRound}>
            Otra palabra
          </button>
        </div>
      ) : null}
      {shareResult ? (
        <>
          <div className="dialog-actions">
            <button
              className="dialog-action"
              type="button"
              disabled={sharing}
              aria-busy={sharing}
              onClick={shareDailyResult}
            >
              Compartir
            </button>
          </div>
          {shareStatus ? (
            <p className="share-status" role="status" aria-live="polite">
              {shareStatus}
            </p>
          ) : null}
        </>
      ) : null}
    </AppDialog>
  )
}

function getPublicShareUrl(): string | undefined {
  const url = new URL(import.meta.env.BASE_URL, window.location.origin)

  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return undefined
  return url.toString()
}

function isShareCancellation(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}
