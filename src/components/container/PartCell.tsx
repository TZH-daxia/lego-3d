import { colorName } from '../../data/colors'
import { SHAPE_MAP } from '../../data/shapes'
import type { ContainerCell } from '../../types'
import { ShapeIcon } from '../ShapeIcon'

export interface PartCellProps {
  cell: ContainerCell
  editable: boolean
  /** 刚取走一件，播放成功反馈 */
  isTaken: boolean
  /** 托盘放不下，播放拒绝反馈 */
  isDenied: boolean
  onPick: (cell: ContainerCell) => void
}

/**
 * 零件盒里的一个格子：一格就是一个造型的"模子"，点一下放一个到托盘。
 * 没有数量概念，也不能编辑 —— 颜色可以选中方块后用上面的色板改。
 */
export function PartCell({ cell, editable, isTaken, isDenied, onPick }: PartCellProps) {
  const shape = cell.shapeId ? SHAPE_MAP.get(cell.shapeId) : undefined

  // 造型数量凑不满一排时，尾巴是空格子：占位但不响应
  if (!shape) return <div className="part-cell is-blank" aria-hidden />

  const color = cell.color ?? '#8a8177'
  // 砖是默认形态不前缀，其它件靠前缀区分：板 / 圆板 / 圆柱 / 坡 / 平
  const kindPrefix =
    shape.kind === 'plate'
      ? '板 '
      : shape.kind === 'round'
        ? shape.h > 1
          ? '圆柱 '
          : '圆板 '
        : shape.kind === 'slope'
          ? '坡 '
          : shape.kind === 'tile'
            ? '平 '
            : ''

  const label = `${shape.desc} · ${colorName(color)}`
  const title = editable ? `${label}\n点一下放一个到托盘 · 颜色用上面的色板改` : '观察模式 · 零件盒已锁定'

  const className = [
    'part-cell',
    'is-filled',
    isTaken ? 'is-taken' : '',
    isDenied ? 'is-denied' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={className}
      role="button"
      tabIndex={editable ? 0 : -1}
      aria-disabled={!editable}
      title={title}
      data-cell={cell.id}
      onClick={() => {
        if (editable) onPick(cell)
      }}
      onKeyDown={(e) => {
        if (!editable) return
        if (e.key !== 'Enter' && e.key !== ' ') return
        e.preventDefault()
        onPick(cell)
      }}
    >
      <span className="part-cell__icon">
        <ShapeIcon shape={shape} color={color} />
      </span>
      <span className="part-cell__label">
        {kindPrefix}
        {shape.label}
      </span>
    </div>
  )
}
