import { useMemo } from 'react'
import { SHAPE_MAP } from '../data/shapes'
import { BOARD_SIZE, orientedSize } from '../lib/grid'
import type { Brick } from '../types'

/** 俯视缩略图：把方块的占地投影到底板上，用作会话行的小预览 */
export function MiniPreview({ bricks }: { bricks: Brick[] }) {
  const cells = useMemo(() => {
    const map = new Map<string, string>()
    for (const b of bricks) {
      const shape = SHAPE_MAP.get(b.shapeId)
      if (!shape) continue
      const s = orientedSize(shape, b.rx, b.ry)
      for (let dx = 0; dx < s.x; dx++) {
        for (let dz = 0; dz < s.z; dz++) {
          map.set(`${b.x + dx},${b.z + dz}`, b.color)
        }
      }
    }
    return map
  }, [bricks])

  const half = BOARD_SIZE / 2

  return (
    <svg className="mini-preview" viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`}>
      <rect x={0} y={0} width={BOARD_SIZE} height={BOARD_SIZE} fill="#131211" />
      {[...cells].map(([key, color]) => {
        const [x, z] = key.split(',').map(Number)
        return (
          <rect
            key={key}
            x={x + half}
            y={z + half}
            width={1.06}
            height={1.06}
            fill={color}
          />
        )
      })}
    </svg>
  )
}
