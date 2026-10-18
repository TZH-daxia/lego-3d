import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { getToolsAnchor, getToolsElement } from '../../lib/brickTools'

/** 按钮列与积木屏幕投影右边缘之间的间距（px） */
const GAP = 26
/** 单个按钮宽度（px），用于贴边时的收敛 */
const BTN_W = 36

const point = new THREE.Vector3()

/**
 * 每帧把选中积木的 8 个包围盒角点投影到屏幕，取投影包围盒的
 * 「右边缘 + 垂直中心」作为浮动按钮的位置，直接写进 transform。
 * 用包围盒而不是固定的 +x 边缘，所以视角怎么转，按钮始终在积木右侧。
 */
export function AnchorTracker() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const last = useRef('')

  useFrame(() => {
    const el = getToolsElement()
    if (!el) return
    const corners = getToolsAnchor()
    if (!corners || corners.length === 0) {
      if (last.current !== 'hidden') {
        last.current = 'hidden'
        el.style.display = 'none'
      }
      return
    }

    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    let seen = 0

    for (const [cx, cy, cz] of corners) {
      point.set(cx, cy, cz).project(camera)
      if (point.z >= 1) continue
      const sx = (point.x * 0.5 + 0.5) * size.width
      const sy = (-point.y * 0.5 + 0.5) * size.height
      if (sx < minX) minX = sx
      if (sx > maxX) maxX = sx
      if (sy < minY) minY = sy
      if (sy > maxY) maxY = sy
      seen++
    }

    if (!seen) {
      if (last.current !== 'hidden') {
        last.current = 'hidden'
        el.style.display = 'none'
      }
      return
    }

    // 贴在投影右边缘之外；积木顶到画布右边时收敛回来，别把按钮挤出可视区
    const x = Math.max(6, Math.min(maxX + GAP, size.width - BTN_W - 10))
    const y = (minY + maxY) / 2
    const onScreen =
      maxX > -120 && minX < size.width + 120 && maxY > -120 && minY < size.height + 120

    const next = onScreen ? `${x.toFixed(1)},${y.toFixed(1)}` : 'hidden'
    if (next === last.current) return
    last.current = next
    if (!onScreen) {
      el.style.display = 'none'
      return
    }
    el.style.display = ''
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
  })

  return null
}
