import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { CONTAINER_COLS } from '../../data/container'
import { useActiveContainer, useEditMode, usePuzzleStore } from '../../store/usePuzzleStore'
import type { ContainerCell, PartPreset } from '../../types'
import { ColorPalette } from '../ColorPalette'
import { PartCell } from './PartCell'
import { PartDialog } from './PartDialog'
import { usePartDrag } from './usePartDrag'

const Icon = {
  row: (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden>
      <path d="M2 5h12M2 11h12" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden>
      <path
        d="M8 3v10M3 8h10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  ),
  minus: (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden>
      <path d="M3 8h10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
}

/** 底部零件盒：固定 6 列多排，空格新增、非空取件、可拖动换位 */
export function ContainerGrid() {
  const container = useActiveContainer()
  const editable = useEditMode()
  const takeFromCell = usePuzzleStore((s) => s.takeFromCell)
  const setContainerCell = usePuzzleStore((s) => s.setContainerCell)
  const swapContainerCells = usePuzzleStore((s) => s.swapContainerCells)
  const addContainerRow = usePuzzleStore((s) => s.addContainerRow)
  const removeContainerRow = usePuzzleStore((s) => s.removeContainerRow)

  const [editing, setEditing] = useState<{ cell: ContainerCell; mode: 'create' | 'edit' } | null>(
    null,
  )
  const [feedback, setFeedback] = useState<{ id: string; kind: 'taken' | 'denied' } | null>(null)
  const timer = useRef<number | null>(null)

  const flash = useCallback((id: string, kind: 'taken' | 'denied') => {
    setFeedback({ id, kind })
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setFeedback(null), 420)
  }, [])

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current)
    },
    [],
  )

  const drag = usePartDrag(swapContainerCells)

  if (!container) return null

  const { cells, cols } = container
  const lastRow = cells.slice(cells.length - cols)
  const canRemoveRow = cells.length > cols && lastRow.every((c) => !c.shapeId || c.count <= 0)

  const onPick = (cell: ContainerCell) => {
    // 拖动之后浏览器会补一个 click，这里吞掉避免误取件
    if (drag.consumeClick()) return
    if (takeFromCell(cell.id)) flash(cell.id, 'taken')
    else flash(cell.id, 'denied')
  }

  const onClear = (cell: ContainerCell) => setContainerCell(cell.id, null)

  const onConfirm = (part: PartPreset) => {
    if (editing) setContainerCell(editing.cell.id, part)
    setEditing(null)
  }

  return (
    <section className="parts" aria-label="零件盒">
      <header className="parts__head">
        <ColorPalette />
        <div className="parts__tools">
          <button
            type="button"
            className="tool-btn"
            disabled={!editable}
            title="在最下面新加一排空格子"
            onClick={addContainerRow}
          >
            {Icon.plus} 一排
          </button>
          <button
            type="button"
            className="tool-btn"
            disabled={!editable || !canRemoveRow}
            title={canRemoveRow ? '删掉最后一排空格子' : '最后一排还有零件，不能删'}
            onClick={removeContainerRow}
          >
            {Icon.minus} 一排
          </button>
        </div>
      </header>

      <div className="parts__scroll">
        <div
          className={`parts__grid${editable ? '' : ' is-locked'}`}
          style={{ '--cols': cols || CONTAINER_COLS } as CSSProperties}
        >
          {cells.map((cell) => (
            <PartCell
              key={cell.id}
              cell={cell}
              editable={editable}
              isSource={drag.sourceId === cell.id}
              isTarget={drag.targetId === cell.id && drag.sourceId !== cell.id}
              isTaken={feedback?.id === cell.id && feedback.kind === 'taken'}
              isDenied={feedback?.id === cell.id && feedback.kind === 'denied'}
              onPick={onPick}
              onEdit={(c) =>
                setEditing({ cell: c, mode: c.count > 0 && c.shapeId ? 'edit' : 'create' })
              }
              onClear={onClear}
              onDragBegin={drag.begin}
              onDragMove={drag.move}
              onDragEnd={drag.end}
              onDragCancel={drag.cancel}
            />
          ))}
        </div>
      </div>

      {!editable && (
        <div className="parts__lock">
          <b>零件盒已锁定</b>
          <span>点右上角铅笔图标回到编辑模式</span>
        </div>
      )}

      {editing && (
        <PartDialog
          mode={editing.mode}
          initial={
            editing.cell.shapeId
              ? {
                  shapeId: editing.cell.shapeId,
                  color: editing.cell.color ?? '#0055BF',
                  count: editing.cell.count,
                }
              : null
          }
          onConfirm={onConfirm}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  )
}
