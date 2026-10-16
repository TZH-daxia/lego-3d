import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export interface ConfirmDialogProps {
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
}

/** 通用二次确认小窗（删除这类不可撤销操作先问一句） */
export function ConfirmDialog({
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  danger = true,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    panelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  return createPortal(
    <div className="modal" onMouseDown={onClose}>
      <div
        ref={panelRef}
        className="modal__panel modal__panel--sm"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return
          e.preventDefault()
          onConfirm()
        }}
      >
        <header className="modal__head modal__head--plain">
          <h3>{title}</h3>
        </header>
        {message && <p className="confirm__message">{message}</p>}
        <footer className="modal__foot">
          <span className="modal__tip" />
          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              {cancelText}
            </button>
            <button
              type="button"
              className={danger ? 'btn btn--danger' : 'btn btn--primary'}
              onClick={onConfirm}
            >
              {confirmText}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
