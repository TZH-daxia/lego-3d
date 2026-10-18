import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import {
  DEFAULT_CAMERA_POSITION,
  DEFAULT_CAMERA_TARGET,
  getCompassRotor,
  registerOrbitControls,
  registerViewReset,
} from '../../lib/camera'

interface ControlsLike {
  target: THREE.Vector3
  update: () => void
  enabled: boolean
}

const ORIGIN = new THREE.Vector3(0, 0, 0)

/**
 * 相机 -> 罗盘：把方位角写进罗盘的 CSS 变量（不触发 React 重渲染），
 * 同时把"重置视角"和"按住零件时暂停视角拖拽"注册给外部。
 */
export function CameraBridge() {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as ControlsLike | null
  const height = useThree((s) => s.size.height)
  const prevHeight = useRef<number | null>(null)

  /**
   * 画布高度变了（拖动零件盒高度 / 窗口缩放）时等比推拉相机：
   * 透视相机的 fov 是竖直方向，画布越矮模型看着越小，这里按高度比例补偿，
   * 让托盘在屏幕上的视觉大小保持不变 —— 拖面板不会把 3D 图"放大/缩小"。
   */
  useEffect(() => {
    const prev = prevHeight.current
    prevHeight.current = height
    if (!prev || !height || prev === height) return
    const target = controls?.target ?? ORIGIN
    const dir = camera.position.clone().sub(target)
    const dist = dir.length()
    if (dist < 1e-3) return
    const next = THREE.MathUtils.clamp((dist * height) / prev, 8, 95)
    camera.position.copy(target).add(dir.setLength(next))
    controls?.update()
  }, [height, camera, controls])

  useEffect(() => {
    registerOrbitControls(controls)
    return () => registerOrbitControls(null)
  }, [controls])

  useEffect(() => {
    const home = new THREE.Vector3(...DEFAULT_CAMERA_TARGET)
    registerViewReset(() => {
      camera.position.set(...DEFAULT_CAMERA_POSITION)
      if (controls) {
        controls.target.copy(home)
        controls.update()
      } else {
        camera.lookAt(home)
      }
    })
    return () => registerViewReset(null)
  }, [camera, controls])

  useFrame(() => {
    const rotor = getCompassRotor()
    if (!rotor) return
    const target = controls?.target ?? ORIGIN
    const deg = (Math.atan2(camera.position.x - target.x, camera.position.z - target.z) * 180) / Math.PI
    if (rotor.style.getPropertyValue('--az') === deg.toFixed(1)) return
    rotor.style.setProperty('--az', deg.toFixed(1))
  })

  return null
}
