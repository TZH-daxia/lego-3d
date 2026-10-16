import { usePuzzleStore } from '../store/usePuzzleStore'

export function Toolbar() {
  const mode = usePuzzleStore((s) => s.puzzles.find((p) => p.id === s.activeId)?.mode ?? 'edit')
  const setMode = usePuzzleStore((s) => s.setMode)

  return (
    <div className="toolbar">
      <span className={`toolbar__badge is-${mode}`}>
        <i />
        {mode === 'edit' ? '编辑模式' : '观察模式'}
      </span>
      <button
        type="button"
        className={`icon-btn${mode === 'edit' ? ' is-on' : ''}`}
        title="编辑：解锁下方格子，可新增 / 移动 / 旋转"
        onClick={() => setMode('edit')}
      >
        <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden>
          <path
            d="M4 20h4L19 9a2.83 2.83 0 0 0-4-4L4 16v4z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path d="M14.5 5.5l4 4" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      </button>
      <button
        type="button"
        className={`icon-btn${mode === 'view' ? ' is-on' : ''}`}
        title="保存：写入本地并进入观察模式"
        onClick={() => setMode('view')}
      >
        <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden>
          <path
            d="M5 4h11l3 3v13H5z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path d="M8 4v5h7V4" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 20v-6h8v6" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      </button>
    </div>
  )
}
