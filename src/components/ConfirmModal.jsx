import { useEffect, useRef } from 'react'
import { content } from '../constant.js'
import { Button } from './ui.jsx'

const copy = content.confirmModal

/**
 * A small confirmation dialog for actions that can't be undone — same veil
 * and sheet treatment as AddExpenseModal, scaled down to a single question.
 */
export default function ConfirmModal({
  title,
  body,
  confirmLabel = copy.defaultConfirmLabel,
  onConfirm,
  onClose,
}) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement
    dialogRef.current?.querySelector('button')?.focus()

    return () => {
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  }, [])

  function handleKeyDown(event) {
    if (event.key === 'Escape') onClose()
  }

  return (
    <div
      className="veil-in fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        onKeyDown={handleKeyDown}
        className="sheet-in w-full max-w-[380px] rounded-t-modal bg-surface p-6 sm:rounded-modal"
      >
        <h2 id="confirm-modal-title" className="text-lg font-semibold text-ink">
          {title}
        </h2>
        {body ? <p className="mt-1.5 text-sm text-ink-soft">{body}</p> : null}

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {copy.cancel}
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
