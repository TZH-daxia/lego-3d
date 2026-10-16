import type { ReactNode } from 'react'
import { colorName } from '../data/colors'
import { ROTATIONS } from '../data/rotations'
import { SHAPE_MAP } from '../data/shapes'
import { useEditMode, usePuzzleStore, useSelectedBrickId } from '../store/usePuzzleStore'
import { RotationIcon } from './RotationIcon'

const arrow = (path: string) => (
  <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden>
    <path d={path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

interface PadButton {
  label: string
  hint: string
  glyph: ReactNode
}

const MOVE_GLYPH = {
  front: arrow('M12 19V6M6.5 11.5L12 6l5.5 5.5'),
  back: arrow('M12 5v13M6.5 12.5L12 18l5.5-5.5'),
  left: arrow('M19 12H6M11.5 6.5L6 12l5.5 5.5'),
  right: arrow('M5 12h13M12.5 6.5L18 12l-5.5 5.5'),
  up: arrow('M12 20V7M8 11l4-4 4 4M8 20h8'),
  down: arrow('M12 4v13M8 13l4 4 4-4M8 4h8'),
}

const MOVES: (PadButton & { dx: number; dy: number; dz: number })[] = [
  { label: '前', hint: 'W', glyph: MOVE_GLYPH.front, dx: 0, dy: 0, dz: -1 },
  { label: '上升', hint: 'E', glyph: MOVE_GLYPH.up, dx: 0, dy: 1, dz: 0 },
  { label: '后', hint: 'S', glyph: MOVE_GLYPH.back, dx: 0, dy: 0, dz: 1 },
  { label: '左', hint: 'A', glyph: MOVE_GLYPH.left, dx: -1, dy: 0, dz: 0 },
  { label: '下降', hint: 'Q', glyph: MOVE_GLYPH.down, dx: 0, dy: -1, dz: 0 },
  { label: '右', hint: 'D', glyph: MOVE_GLYPH.right, dx: 1, dy: 0, dz: 0 },
]

/** 四个旋转动作和积木旁边的浮动按钮共用一份定义，图标完全一致 */
const ROTATES = ROTATIONS

export function ControlPad() {
  const editable = useEditMode()
  const selectedId = useSelectedBrickId()
  const bricks = usePuzzleStore((s) => s.puzzles.find((p) => p.id === s.activeId)?.bricks)
  const moveSelected = usePuzzleStore((s) => s.moveSelected)
  const rotateSelected = usePuzzleStore((s) => s.rotateSelected)
  const deleteSelected = usePuzzleStore((s) => s.deleteSelected)
  const clearBricks = usePuzzleStore((s) => s.clearBricks)

  const selected = bricks?.find((b) => b.id === selectedId) ?? null
  const shape = selected ? SHAPE_MAP.get(selected.shapeId) : undefined
  const disabled = !editable || !selected
  const total = bricks?.length ?? 0

  return (
    <div className="pad">
      <div className="pad__head">
        <span className="pad__title">
          操作台<i>{total}</i>
        </span>
        <span className={`pad__target${selected ? '' : ' is-empty'}`}>
          {selected && shape ? (
            <>
              <i style={{ background: selected.color }} />
              <b>{shape.label}</b>
              <span>{colorName(selected.color)}</span>
            </>
          ) : (
            <span>未选中方块 · 到场景里点一个</span>
          )}
        </span>
      </div>

      <div className={`pad__body${disabled ? ' is-locked' : ''}`}>
        <div className="pad__section">
          <div className="pad__section-title">
            平移<span>同层前后左右 / 上下</span>
          </div>
          <div className="pad__grid pad__grid--move">
            {MOVES.map((m) => (
              <button
                key={m.label}
                type="button"
                className="pad__btn"
                disabled={disabled}
                title={`${m.label}（${m.hint}）`}
                onClick={() => moveSelected(m.dx, m.dy, m.dz)}
              >
                <i className="pad__glyph">{m.glyph}</i>
                <b>{m.label}</b>
                <em>{m.hint}</em>
              </button>
            ))}
          </div>
        </div>

        <div className="pad__section">
          <div className="pad__section-title">
            旋转<span>90° 步进</span>
          </div>
          <div className="pad__grid pad__grid--rotate">
            {ROTATES.map((r) => (
              <button
                key={r.id}
                type="button"
                className="pad__btn"
                disabled={disabled}
                title={`${r.label}（${r.hint}）`}
                onClick={() => rotateSelected(r.axis, r.dir)}
              >
                <i className="pad__glyph">
                  <RotationIcon action={r} />
                </i>
                <b>{r.label}</b>
                <em>{r.hint}</em>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="pad__foot">
        <button
          type="button"
          className="pad__btn pad__btn--danger"
          disabled={disabled}
          onClick={deleteSelected}
        >
          <b>删除选中方块</b>
          <em>Delete</em>
        </button>
        <button
          type="button"
          className="pad__btn"
          disabled={!editable || total === 0}
          title="清空托盘里的全部方块"
          onClick={() => {
            if (total > 0 && window.confirm(`确定清空托盘里的 ${total} 个方块？`)) clearBricks()
          }}
        >
          <b>清空托盘</b>
          <em>{total} 块</em>
        </button>
      </div>
    </div>
  )
}
