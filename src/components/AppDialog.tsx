import { X } from '@phosphor-icons/react/X'
import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'

type AppDialogProps = Readonly<{
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}>

export default function AppDialog({ open, title, onClose, children }: AppDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

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
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClose={onClose}
    >
      <div className="dialog-heading">
        <h2 id={titleId}>{title}</h2>
        <button className="dialog-close" type="button" aria-label="Cerrar" onClick={onClose}>
          <X size={20} weight="regular" aria-hidden="true" />
        </button>
      </div>
      {children}
    </dialog>
  )
}
