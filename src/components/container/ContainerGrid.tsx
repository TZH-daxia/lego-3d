import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { CONTAINER_COLS } from '../../data/container'
import { useActiveContainer, useEditMode, usePuzzleStore } from '../../store/usePuzzleStore'
import type { ContainerCell } from '../../types'
import { ColorPalette } from '../ColorPalette'
import { PartCell } from './PartCell'

/**
 * 底部零件盒：全部造型按常用度铺开（颜色随机、取用不限量）。
 * 想换颜色就选中方块后用上方的色板改 —— 这里不提供新增 / 编辑 / 数量。
 */
export function ContainerGrid() {
  const container = useActiveContainer()
  const editable = useEditMode()
  const takeFromCell = usePuzzleStore((s) => s.takeFromCell)

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

  if (!container) return null

  const { cells, cols } = container

  const onPick = (cell: ContainerCell) => {
    if (takeFromCell(cell.id)) flash(cell.id, 'taken')
    else flash(cell.id, 'denied')
  }

  return (
    <section className="parts" aria-label="零件盒">
      <header className="parts__head">
        <ColorPalette />
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
              isTaken={feedback?.id === cell.id && feedback.kind === 'taken'}
              isDenied={feedback?.id === cell.id && feedback.kind === 'denied'}
              onPick={onPick}
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
    </section>
  )
}
