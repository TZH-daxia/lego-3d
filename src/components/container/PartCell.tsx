import type { PointerEvent as ReactPointerEvent } from 'react'
import { colorName } from '../../data/colors'
import { SHAPE_MAP } from '../../data/shapes'
import type { ContainerCell } from '../../types'
import { ShapeIcon } from '../ShapeIcon'

export interface PartCellProps {
  cell: ContainerCell
  editable: boolean
  /** 正在被拖动 */
  isSource: boolean
  /** 当前悬停的落点 */
  isTarget: boolean
  /** 刚取走一件，播放成功反馈 */
  isTaken: boolean
  /** 取件失败（托盘放不下），播放拒绝反馈 */
  isDenied: boolean
  onPick: (cell: ContainerCell) => void
  onEdit: (cell: ContainerCell) => void
  onClear: (cell: ContainerCell) => void
  onDragBegin: (cell: ContainerCell, e: ReactPointerEvent<HTMLElement>) => void
  onDragMove: (e: ReactPointerEvent<HTMLElement>) => void
  onDragEnd: (e: ReactPointerEvent<HTMLElement>) => void
  onDragCancel: (e: ReactPointerEvent<HTMLElement>) => void
}

const Icon = {
  edit: (
    <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden>
      <path
        d="M11.2 2.3l2.5 2.5-7.4 7.4-2.9.4.4-2.9z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  ),
  clear: (
    <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden>
      <path
        d="M4 4l8 8M12 4l-8 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        d="M12 6v12M6 12h12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  ),
}

/** 容器里的一个格子：空格子点击新增，非空格子点击取件、拖动换位 */
export function PartCell({
  cell,
  editable,
  isSource,
  isTarget,
  isTaken,
  isDenied,
  onPick,
  onEdit,
  onClear,
  onDragBegin,
  onDragMove,
  onDragEnd,
  onDragCancel,
}: PartCellProps) {
  const shape = cell.shapeId ? SHAPE_MAP.get(cell.shapeId) : undefined
  const color = cell.color ?? '#8a8177'
  const filled = Boolean(shape) && cell.count > 0
  const ghost = Boolean(shape) && !filled

  const className = [
    'part-cell',
    filled ? 'is-filled' : 'is-empty',
    ghost ? 'is-ghost' : '',
    isSource ? 'is-source' : '',
    isTarget ? 'is-target' : '',
    isTaken ? 'is-taken' : '',
    isDenied ? 'is-denied' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const label = filled
    ? `${shape!.desc} · ${colorName(color)} · 剩 ${cell.count} 件`
    : ghost
      ? `点击补货：${shape!.desc} · ${colorName(color)}`
      : '点击放入零件'

  // 同样尺寸的砖 / 圆柱 / 斜面，靠一个短前缀区分
  const kindPrefix =
    shape?.kind === 'round' ? '圆 ' : shape?.kind === 'slope' ? '坡 ' : shape?.kind === 'tile' ? '平 ' : ''

  const title = !filled && !ghost ? '点击新增零件' : `${label}\n点击取 1 件放进托盘 · 拖动可换位`

  return (
    <div
      className={className}
      role="button"
      tabIndex={editable ? 0 : -1}
      aria-disabled={!editable}
      title={editable ? title : '观察模式 · 零件盒已锁定'}
      data-cell={cell.id}
      onClick={() => {
        if (!editable) return
        if (filled) onPick(cell)
        else onEdit(cell)
      }}
      onKeyDown={(e) => {
        if (!editable) return
        if (e.key !== 'Enter' && e.key !== ' ') return
        e.preventDefault()
        if (filled) onPick(cell)
        else onEdit(cell)
      }}
      onPointerDown={(e) => {
        if (editable && filled) onDragBegin(cell, e)
      }}
      onPointerMove={onDragMove}
      onPointerUp={onDragEnd}
      onPointerCancel={onDragCancel}
    >
      {shape && (
        <span className="part-cell__icon" style={{ opacity: filled ? 1 : 0.22 }}>
          <ShapeIcon shape={shape} color={color} />
        </span>
      )}

      {!shape && <span className="part-cell__plus">{Icon.plus}</span>}

      {filled && (
        <>
          <span className="part-cell__count" aria-hidden>
            {cell.count}
          </span>
          <span className="part-cell__label">
            {kindPrefix}
            {shape!.label}
          </span>
          <span className="part-cell__acts">
            <button
              type="button"
              className="part-cell__act"
              title="编辑这个零件"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(cell)
              }}
            >
              {Icon.edit}
            </button>
            <button
              type="button"
              className="part-cell__act"
              title="清空这个格子"
              onClick={(e) => {
                e.stopPropagation()
                onClear(cell)
              }}
            >
              {Icon.clear}
            </button>
          </span>
        </>
      )}

      {ghost && <span className="part-cell__refill">补货</span>}
    </div>
  )
}
