import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { createPortal } from 'react-dom'
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

const Icon = {
  more: (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden>
      <circle cx="12" cy="5" r="1.7" fill="currentColor" />
      <circle cx="12" cy="12" r="1.7" fill="currentColor" />
      <circle cx="12" cy="19" r="1.7" fill="currentColor" />
    </svg>
  ),
  rename: (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden>
      <path
        d="M11.2 2.3l2.5 2.5-7.4 7.4-2.9.4.4-2.9z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden>
      <path
        d="M2.6 4.2h10.8M6.2 4.2V2.6h3.6v1.6M3.9 4.2l.7 9.2h6.8l.7-9.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  ),
}

/** 弹出菜单的高度估算值：贴到窗口底部时改成向上弹 */
const MENU_H = 78

interface MenuAnchor {
  id: string
  style: CSSProperties
}

interface SessionMenuProps {
  style: CSSProperties
  onRename: () => void
  onDelete: () => void
  onClose: () => void
}

/** 点「⋮」后弹出的小窗：定位在图标下方，放不下就向上弹 */
function SessionMenu({ style, onRename, onDelete, onClose }: SessionMenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  const closeFn = useRef(onClose)
  closeFn.current = onClose

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null
      if (ref.current?.contains(target as Node)) return
      // 点「⋮」本身交给按钮自己切换，避免刚关掉又被重新打开
      if (target?.closest('.session__more')) return
      closeFn.current()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeFn.current()
    }
    const onViewportChange = () => closeFn.current()

    document.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onViewportChange, true)
    window.addEventListener('resize', onViewportChange)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onViewportChange, true)
      window.removeEventListener('resize', onViewportChange)
    }
  }, [])

  return createPortal(
    <div className="session-menu" style={style} ref={ref} role="menu">
      <button type="button" className="session-menu__item" role="menuitem" onClick={onRename}>
        <i>{Icon.rename}</i>
        重命名
      </button>
      <button
        type="button"
        className="session-menu__item is-danger"
        role="menuitem"
        onClick={onDelete}
      >
        <i>{Icon.trash}</i>
        删除
      </button>
    </div>,
    document.body,
  )
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
  const [menu, setMenu] = useState<MenuAnchor | null>(null)

  const commitRename = (id: string) => {
    renamePuzzle(id, draft)
    setEditingId(null)
  }

  const startRename = (puzzle: Puzzle) => {
    setDraft(puzzle.name)
    setEditingId(puzzle.id)
  }

  const toggleMenu = (puzzle: Puzzle, el: HTMLElement) => {
    if (menu?.id === puzzle.id) {
      setMenu(null)
      return
    }
    const rect = el.getBoundingClientRect()
    const up = rect.bottom + 6 + MENU_H > window.innerHeight
    const right = window.innerWidth - rect.right
    setMenu({
      id: puzzle.id,
      style: up
        ? { right, bottom: window.innerHeight - rect.top + 6 }
        : { right, top: rect.bottom + 6 },
    })
  }

  const target = menu ? (puzzles.find((p) => p.id === menu.id) ?? null) : null

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <img className="brand-logo" src="/favicon.svg" alt="" aria-hidden />
        <div>
          <h1>模拟乐高拼图</h1>
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
                    title="双击也可以重命名"
                    onDoubleClick={(e) => {
                      e.stopPropagation()
                      startRename(p)
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
                className={`session__more${menu?.id === p.id ? ' is-open' : ''}`}
                title="更多操作"
                aria-haspopup="menu"
                aria-expanded={menu?.id === p.id}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleMenu(p, e.currentTarget)
                }}
              >
                {Icon.more}
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

      {menu && target && (
        <SessionMenu
          style={menu.style}
          onClose={() => setMenu(null)}
          onRename={() => {
            setMenu(null)
            startRename(target)
          }}
          onDelete={() => {
            setMenu(null)
            setPendingDelete(target)
          }}
        />
      )}

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
