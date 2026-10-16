import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { getToolsAnchor, getToolsElement } from '../../lib/brickTools'

const point = new THREE.Vector3()

/** 每帧把锚点世界坐标投影到屏幕坐标，直接写进浮动按钮的 transform */
export function AnchorTracker() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const last = useRef('')

  useFrame(() => {
    const el = getToolsElement()
    if (!el) return
    const anchor = getToolsAnchor()
    if (!anchor) {
      if (last.current !== 'hidden') {
        last.current = 'hidden'
        el.style.display = 'none'
      }
      return
    }

    point.set(anchor[0], anchor[1], anchor[2]).project(camera)
    const x = (point.x * 0.5 + 0.5) * size.width
    const y = (-point.y * 0.5 + 0.5) * size.height
    const onScreen =
      point.z < 1 && x > -80 && x < size.width + 80 && y > -80 && y < size.height + 80

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
