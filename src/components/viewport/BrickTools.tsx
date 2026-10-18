import { useEffect, useRef } from 'react'
import { ROTATIONS } from '../../data/rotations'
import { SHAPE_MAP } from '../../data/shapes'
import { PLATE, STUD, orientedSize, worldCenter } from '../../lib/grid'
import { registerToolsElement, setToolsAnchor } from '../../lib/brickTools'
import { useActiveBricks, useEditMode, usePuzzleStore, useSelectedBrickId } from '../../store/usePuzzleStore'
import { RotationIcon } from '../RotationIcon'

/**
 * 选中积木右侧浮出的一列透明按钮：向上翻 / 向下翻 / 向左转 / 向右转，
 * 点一下转 90°，可以连着点。这是唯一的旋转入口（不绑键盘快捷键）。
 *
 * 位置由画布里的 AnchorTracker 每帧投影写入 transform。
 */
export function BrickTools() {
  const bricks = useActiveBricks()
  const selectedId = useSelectedBrickId()
  const editable = useEditMode()
  const rotateSelected = usePuzzleStore((s) => s.rotateSelected)
  const hostRef = useRef<HTMLDivElement>(null)

  const selected = editable ? bricks.find((b) => b.id === selectedId) : undefined

  useEffect(() => {
    registerToolsElement(hostRef.current)
    return () => registerToolsElement(null)
  }, [selected])

  useEffect(() => {
    if (!selected) {
      setToolsAnchor(null)
      return
    }
    const shape = SHAPE_MAP.get(selected.shapeId)
    if (!shape) {
      setToolsAnchor(null)
      return
    }
    const size = orientedSize(shape, selected.rx, selected.ry)
    const [cx, cy, cz] = worldCenter(selected.x, selected.y, selected.z, size)
    // 交出包围盒的 8 个角点：由 AnchorTracker 投影出屏幕包围盒，按钮总在积木右侧
    const hx = (size.x * STUD) / 2
    const hy = (size.y * PLATE) / 2
    const hz = (size.z * STUD) / 2
    const corners: [number, number, number][] = []
    for (const dx of [-1, 1]) {
      for (const dy of [-1, 1]) {
        for (const dz of [-1, 1]) {
          corners.push([cx + dx * hx, cy + dy * hy, cz + dz * hz])
        }
      }
    }
    setToolsAnchor(corners)
  }, [selected])

  useEffect(() => () => setToolsAnchor(null), [])

  if (!selected) return null

  return (
    <div className="brick-tools" ref={hostRef} style={{ display: 'none' }}>
      <div className="brick-tools__list">
        {ROTATIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            className="brick-tool"
            title={action.label}
            /* 不进 tab 序、点完立刻失焦：否则按 W/A/S/D 时浏览器会给它套上焦点高亮 */
            tabIndex={-1}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.currentTarget.blur()
              rotateSelected(action.axis, action.dir)
            }}
          >
            <RotationIcon action={action} size={23} />
          </button>
        ))}
      </div>
    </div>
  )
}
