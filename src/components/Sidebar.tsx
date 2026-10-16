import { useState } from 'react'
import { usePuzzleStore } from '../store/usePuzzleStore'
import type { Puzzle } from '../types'
import { ConfirmDialog } from './ConfirmDialog'
import { MiniPreview } from './MiniPreview'

function timeAgo(ts: number) {
  const diff = Date.now() - ts
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`
  return `${Math.floor(diff / 86_400_000)} 天前`
}

export function Sidebar() {
  const puzzles = usePuzzleStore((s) => s.puzzles)
  const activeId = usePuzzleStore((s) => s.activeId)
  const createPuzzle = usePuzzleStore((s) => s.createPuzzle)
  const openPuzzle = usePuzzleStore((s) => s.openPuzzle)
  const deletePuzzle = usePuzzleStore((s) => s.deletePuzzle)
  const renamePuzzle = usePuzzleStore((s) => s.renamePuzzle)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Puzzle | null>(null)

  const commitRename = (id: string) => {
    renamePuzzle(id, draft)
    setEditingId(null)
  }

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="brand-mark" aria-hidden>
          <i />
          <i />
          <i />
          <i />
        </span>
        <div>
          <h1>乐高拼图</h1>
          <p>3D Brick Studio</p>
        </div>
      </div>

      <button className="btn btn--primary sidebar__new" onClick={() => createPuzzle()}>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
          <path
            d="M12 5v14M5 12h14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
        新增拼图
      </button>

      <div className="sidebar__label">
        <span>我的拼图</span>
        <span className="count">{puzzles.length}</span>
      </div>

      <div className="sidebar__list">
        {puzzles.map((p) => {
          const active = p.id === activeId
          return (
            <div
              key={p.id}
              className={`session${active ? ' is-active' : ''}`}
              onClick={() => openPuzzle(p.id)}
            >
              <div className="session__thumb">
                <MiniPreview bricks={p.bricks} />
              </div>
              <div className="session__body">
                {editingId === p.id ? (
                  <input
                    className="session__input"
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => commitRename(p.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename(p.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div
                    className="session__name"
                    title="双击重命名"
                    onDoubleClick={(e) => {
                      e.stopPropagation()
                      setDraft(p.name)
                      setEditingId(p.id)
                    }}
                  >
                    {p.name}
                  </div>
                )}
                <div className="session__meta">
                  <span className={`tag tag--${p.mode}`}>{p.mode === 'edit' ? '编辑中' : '已保存'}</span>
                  <span>{p.bricks.length} 块</span>
                  <span>{timeAgo(p.updatedAt)}</span>
                </div>
              </div>
              <button
                className="session__del"
                title="删除"
                onClick={(e) => {
                  e.stopPropagation()
                  setPendingDelete(p)
                }}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden>
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          )
        })}

        {puzzles.length === 0 && (
          <div className="sidebar__empty">
            还没有拼图
            <br />
            点击上方「新增拼图」开始创作
          </div>
        )}
      </div>

      {pendingDelete && (
        <ConfirmDialog
          title="删除这个拼图？"
          message={
            pendingDelete.bricks.length > 0
              ? `「${pendingDelete.name}」里的 ${pendingDelete.bricks.length} 块积木会一起删掉，删除后无法恢复。`
              : `「${pendingDelete.name}」删除后无法恢复。`
          }
          confirmText="删除"
          onConfirm={() => {
            deletePuzzle(pendingDelete.id)
            setPendingDelete(null)
          }}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </aside>
  )
}
