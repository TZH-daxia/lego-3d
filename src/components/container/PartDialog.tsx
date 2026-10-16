import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { COLORS } from '../../data/colors'
import { MAX_PART_COUNT } from '../../data/container'
import { SHAPES, SHAPE_GROUPS, SHAPE_MAP } from '../../data/shapes'
import type { PartPreset, ShapeGroup } from '../../types'
import { ShapeIcon } from '../ShapeIcon'

const QUICK_COUNTS = [1, 2, 4, 6, 8, 12]

const FallbackShape = 'b1x1'

export interface PartDialogProps {
  /** 打开时预填的内容：空格子可能是 null */
  initial: PartPreset | null
  /** 标题动词，新增 / 编辑 */
  mode: 'create' | 'edit'
  onConfirm: (part: PartPreset) => void
  onClose: () => void
}

const groupOf = (shapeId: string | null): ShapeGroup =>
  (shapeId ? SHAPE_MAP.get(shapeId)?.group : undefined) ?? SHAPE_GROUPS[0]

const clamp = (n: number) => Math.min(MAX_PART_COUNT, Math.max(1, Math.round(n) || 1))

/** 零件弹窗：选造型 → 选颜色 → 定数量 */
export function PartDialog({ initial, mode, onConfirm, onClose }: PartDialogProps) {
  const [shapeId, setShapeId] = useState(initial?.shapeId ?? FallbackShape)
  const [color, setColor] = useState(initial?.color ?? COLORS[4].hex)
  const [count, setCount] = useState(initial?.count && initial.count > 0 ? initial.count : 4)
  const [group, setGroup] = useState<ShapeGroup>(groupOf(initial?.shapeId ?? FallbackShape))
  const panelRef = useRef<HTMLDivElement>(null)

  const shape = SHAPE_MAP.get(shapeId) ?? SHAPE_MAP.get(FallbackShape)!
  const shapes = useMemo(() => SHAPES.filter((s) => s.group === group), [group])

  useEffect(() => {
    panelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  const confirm = () => onConfirm({ shapeId: shape.id, color, count: clamp(count) })

  return createPortal(
    <div className="modal" onMouseDown={onClose}>
      <div
        ref={panelRef}
        className="modal__panel"
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'edit' ? '编辑零件' : '新增零件'}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            e.preventDefault()
            confirm()
          }
        }}
      >
        <header className="modal__head">
          <div>
            <h3>{mode === 'edit' ? '编辑零件' : '新增零件'}</h3>
            <p>选好造型、颜色和数量，放进零件盒的格子里</p>
          </div>
          <button type="button" className="modal__close" onClick={onClose} aria-label="关闭">
            <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden>
              <path
                d="M4 4l8 8M12 4l-8 8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        <div className="modal__body">
          <section className="picker">
            <div className="picker__tabs" role="tablist">
              {SHAPE_GROUPS.map((g) => (
                <button
                  key={g}
                  type="button"
                  role="tab"
                  aria-selected={g === group}
                  className={`picker__tab${g === group ? ' is-on' : ''}`}
                  onClick={() => setGroup(g)}
                >
                  {g}
                  <i>{SHAPES.filter((s) => s.group === g).length}</i>
                </button>
              ))}
            </div>
            <div className="picker__grid">
              {shapes.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`pick${s.id === shapeId ? ' is-on' : ''}`}
                  title={s.desc}
                  onClick={() => setShapeId(s.id)}
                >
                  <span className="pick__icon">
                    <ShapeIcon shape={s} color={color} />
                  </span>
                  <span className="pick__label">{s.label}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="modal__side">
            <div className="preview">
              <span className="preview__stage">
                <ShapeIcon shape={shape} color={color} />
              </span>
              <span className="preview__meta">
                <b>{shape.desc}</b>
                <em>
                  {COLORS.find((c) => c.hex.toLowerCase() === color.toLowerCase())?.name ?? color} ·{' '}
                  {clamp(count)} 件
                </em>
              </span>
            </div>

            <div className="field">
              <span className="field__label">
                颜色<i>{COLORS.length}</i>
              </span>
              <div className="swatches">
                {COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    className={`swatch${color.toLowerCase() === c.hex.toLowerCase() ? ' is-on' : ''}`}
                    style={{ background: c.hex }}
                    title={c.name}
                    onClick={() => setColor(c.hex)}
                  />
                ))}
              </div>
            </div>

            <div className="field">
              <span className="field__label">数量</span>
              <div className="stepper">
                <button
                  type="button"
                  className="stepper__btn"
                  onClick={() => setCount((n) => clamp(n - 1))}
                  aria-label="减少"
                >
                  −
                </button>
                <input
                  className="stepper__input"
                  type="number"
                  min={1}
                  max={MAX_PART_COUNT}
                  value={count}
                  onChange={(e) => {
                    const next = Number(e.target.value)
                    setCount(Number.isFinite(next) ? Math.min(MAX_PART_COUNT, next) : 1)
                  }}
                  onBlur={() => setCount((n) => clamp(n))}
                />
                <button
                  type="button"
                  className="stepper__btn"
                  onClick={() => setCount((n) => clamp(n + 1))}
                  aria-label="增加"
                >
                  +
                </button>
              </div>
              <div className="quick">
                {QUICK_COUNTS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`quick__chip${clamp(count) === n ? ' is-on' : ''}`}
                    onClick={() => setCount(n)}
                  >
                    ×{n}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        <footer className="modal__foot">
          <span className="modal__tip">空格子＝新增零件 · 非空格子＝取件到托盘 · 拖动可换位</span>
          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              取消
            </button>
            <button type="button" className="btn btn--primary" onClick={confirm}>
              {mode === 'edit' ? '保存修改' : '放入格子'}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
