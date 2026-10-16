import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { SHAPE_MAP } from '../../data/shapes'
import { suspendOrbitForPointer } from '../../lib/camera'
import { PLATE, STUD, orientedSize, worldCenter } from '../../lib/grid'
import { markShadowDirty } from '../../lib/shadow'
import { useEditMode, usePuzzleStore } from '../../store/usePuzzleStore'
import type { Brick as BrickModel } from '../../types'
import { getBrickGeometry } from './brickGeometry'

const FLASH = new THREE.Color('#ff3b30')
const TWO_PI = Math.PI * 2
const HALF_PI = Math.PI / 2
const SHAKE_TIME = 0.42
/** 出生动画：下落高度与弹入时长（尽快结束，避免动画期间点不中） */
const BORN_HEIGHT = 1.5
const BORN_TIME = 0.3

/** 描边 / 地面投影只是视觉辅助，必须退出射线检测 */
const noRaycast = () => null

const easeOutBack = (t: number) => {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2
}

/** 求与当前角度最接近的等价目标角，避免旋转绕远路 */
function nearestAngle(current: number, target: number) {
  let delta = (target - current) % TWO_PI
  if (delta > Math.PI) delta -= TWO_PI
  if (delta < -Math.PI) delta += TWO_PI
  return current + delta
}

interface Shake {
  life: number
  kind: 'move' | 'rotate'
  dir: THREE.Vector3
}

export function Brick({ brick }: { brick: BrickModel }) {
  const shape = SHAPE_MAP.get(brick.shapeId)!
  const size = orientedSize(shape, brick.rx, brick.ry)
  const [cx, cy, cz] = worldCenter(brick.x, brick.y, brick.z, size)
  const wx = size.x * STUD
  const wy = size.y * PLATE
  const wz = size.z * STUD

  const editable = useEditMode()
  const selected = usePuzzleStore((s) => s.selectedBrickId === brick.id)
  const blocked = usePuzzleStore((s) => s.blocked)
  const selectBrick = usePuzzleStore((s) => s.selectBrick)

  const groupRef = useRef<THREE.Group>(null!)
  const pitchRef = useRef<THREE.Group>(null!)
  const yawRef = useRef<THREE.Group>(null!)

  const { body, studs } = getBrickGeometry(shape)

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(brick.color),
        roughness: 0.38,
        metalness: 0.06,
      }),
    [brick.color],
  )
  useEffect(() => () => material.dispose(), [material])

  const outline = useMemo(
    () => new THREE.EdgesGeometry(new THREE.BoxGeometry(wx * 1.02, wy * 1.02, wz * 1.02)),
    [wx, wy, wz],
  )
  useEffect(() => () => outline.dispose(), [outline])

  const current = useRef<THREE.Vector3 | null>(null)
  const angles = useRef({ rx: 0, ry: 0 })
  const shake = useRef<Shake | null>(null)
  const born = useRef<number | null>(null)
  const tmp = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    if (!blocked || blocked.brickId !== brick.id) return
    shake.current = {
      life: 0,
      kind: blocked.kind,
      dir: new THREE.Vector3(blocked.dir[0], blocked.dir[1], blocked.dir[2]),
    }
  }, [blocked, brick.id])

  useFrame((state, rawDelta) => {
    const g = groupRef.current
    if (!g || !pitchRef.current || !yawRef.current) return
    const dt = Math.min(rawDelta, 0.05)

    if (born.current === null) {
      born.current = state.clock.elapsedTime
      current.current = new THREE.Vector3(cx, cy + BORN_HEIGHT, cz)
      angles.current = { rx: brick.rx * (Math.PI / 2), ry: brick.ry * (Math.PI / 2) }
    }

    const age = state.clock.elapsedTime - born.current
    const pop = easeOutBack(Math.min(1, Math.max(0, age / BORN_TIME)))

    // 位置阻尼跟随
    tmp.set(cx, cy, cz)
    current.current!.lerp(tmp, 1 - Math.exp(-15 * dt))

    // 旋转阻尼跟随（走最短角）
    const k = 1 - Math.exp(-17 * dt)
    angles.current.rx +=
      (nearestAngle(angles.current.rx, brick.rx * (Math.PI / 2)) - angles.current.rx) * k
    angles.current.ry +=
      (nearestAngle(angles.current.ry, brick.ry * (Math.PI / 2)) - angles.current.ry) * k

    // 碰撞反馈：位移抖动 / 原地扭动 + 红闪
    let ox = 0
    let oy = 0
    let oz = 0
    let wobble = 0
    let flash = 0
    const s = shake.current
    if (s) {
      s.life += dt
      const t = s.life / SHAKE_TIME
      if (t >= 1) {
        shake.current = null
      } else {
        const decay = 1 - t
        const wave = Math.sin(t * Math.PI * 5) * decay
        flash = decay * decay
        if (s.kind === 'move') {
          ox = s.dir.x * 0.3 * wave
          oy = s.dir.y * 0.3 * wave
          oz = s.dir.z * 0.3 * wave
        } else {
          wobble = wave * 0.16
        }
      }
    }

    g.position.set(current.current!.x + ox, current.current!.y + oy, current.current!.z + oz)
    g.rotation.z = wobble
    g.scale.setScalar(pop)
    yawRef.current.rotation.y = angles.current.ry
    pitchRef.current.rotation.x = angles.current.rx

    // 只在真的动的时候告诉场景"阴影该重算了"
    if (
      Math.abs(current.current!.x - cx) +
        Math.abs(current.current!.y - cy) +
        Math.abs(current.current!.z - cz) >
        1e-3 ||
      Math.abs(angles.current.rx - brick.rx * HALF_PI) +
        Math.abs(angles.current.ry - brick.ry * HALF_PI) >
        1e-3 ||
      Math.abs(pop - 1) > 1e-3 ||
      shake.current !== null
    ) {
      markShadowDirty()
    }

    // 只有碰撞反馈才动自发光：选中高亮不做颜色偏移，
    // 保证方块颜色和零件盒里选的颜色完全一致（选中靠描边 + 地面投影表达）
    if (flash > 0.001) {
      material.emissive.copy(FLASH).multiplyScalar(flash)
    } else {
      material.emissive.setRGB(0, 0, 0)
    }
  })

  return (
    <>
      {selected && editable && (
        <mesh rotation-x={-Math.PI / 2} position={[cx, 0.03, cz]} raycast={noRaycast}>
          <planeGeometry args={[wx, wz]} />
          <meshBasicMaterial color="#ffc53d" transparent opacity={0.22} depthWrite={false} />
        </mesh>
      )}
      <group
        ref={groupRef}
        onPointerDown={(e) => {
          if (!editable) return
          e.stopPropagation()
          // 按住零件时先关掉视角拖拽，避免"点零件"变成"转视角"
          suspendOrbitForPointer()
          selectBrick(brick.id)
        }}
      >
        <group ref={yawRef}>
          <group ref={pitchRef}>
            <mesh geometry={body} material={material} castShadow receiveShadow />
            {studs && <mesh geometry={studs} material={material} castShadow receiveShadow />}
          </group>
        </group>
        {selected && editable && (
          <lineSegments geometry={outline} raycast={noRaycast}>
            <lineBasicMaterial color="#ffffff" transparent opacity={0.85} />
          </lineSegments>
        )}
      </group>
    </>
  )
}
