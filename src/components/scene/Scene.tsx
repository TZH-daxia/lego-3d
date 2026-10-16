import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import type { WebGLRenderer } from 'three'
import { DEFAULT_CAMERA_TARGET } from '../../lib/camera'
import { consumeShadowDirty, markShadowDirty } from '../../lib/shadow'
import { useActiveBricks } from '../../store/usePuzzleStore'
import { AnchorTracker } from './AnchorTracker'
import { Baseplate } from './Baseplate'
import { Brick } from './Brick'
import { CameraBridge } from './CameraBridge'

const SHADOW = 30

/* shadowMap 的读写都收在这两个函数里，避免在组件里直接改 hook 返回值 */
const disableShadowAutoUpdate = (gl: WebGLRenderer) => {
  gl.shadowMap.autoUpdate = false
}
const flushShadow = (gl: WebGLRenderer) => {
  gl.shadowMap.needsUpdate = true
}

export function Scene() {
  const bricks = useActiveBricks()
  const gl = useThree((s) => s.gl)

  useEffect(() => {
    disableShadowAutoUpdate(gl)
    markShadowDirty()
  }, [gl])

  /* 增删方块后重新算一次阴影 */
  useEffect(() => {
    markShadowDirty()
  }, [bricks])

  useFrame(() => {
    if (consumeShadowDirty()) flushShadow(gl)
  })

  return (
    <>
      <color attach="background" args={['#100f0e']} />
      <fog attach="fog" args={['#100f0e', 66, 150]} />

      <hemisphereLight args={['#ffe8c4', '#17140f', 0.8]} />
      <ambientLight intensity={0.32} />
      <directionalLight
        castShadow
        color="#fff3e0"
        position={[20, 30, 16]}
        intensity={1.65}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-SHADOW}
        shadow-camera-right={SHADOW}
        shadow-camera-top={SHADOW}
        shadow-camera-bottom={-SHADOW}
        shadow-camera-near={1}
        shadow-camera-far={90}
        shadow-bias={-0.0006}
      />
      <directionalLight position={[-18, 12, -20]} intensity={0.4} color="#9fc2ff" />

      <Baseplate />
      {bricks.map((b) => (
        <Brick key={b.id} brick={b} />
      ))}

      <AnchorTracker />
      <CameraBridge />
      <OrbitControls
        makeDefault
        target={DEFAULT_CAMERA_TARGET}
        enableDamping
        dampingFactor={0.08}
        minDistance={8}
        maxDistance={95}
        maxPolarAngle={Math.PI / 2 - 0.04}
      />
    </>
  )
}
