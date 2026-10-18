import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { BOARD_MIN, BOARD_SIZE, PLATE, STUD, STUD_H, STUD_R } from '../../lib/grid'

/** 32×32 乐高底板，凸点用 InstancedMesh 渲染 */
export function Baseplate() {
  const ref = useRef<THREE.InstancedMesh>(null!)
  const studGeo = useMemo(() => new THREE.CylinderGeometry(STUD_R, STUD_R, STUD_H, 20), [])
  const count = BOARD_SIZE * BOARD_SIZE

  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    let i = 0
    for (let ix = 0; ix < BOARD_SIZE; ix++) {
      for (let iz = 0; iz < BOARD_SIZE; iz++) {
        m.makeTranslation(BOARD_MIN + ix + 0.5, STUD_H / 2, BOARD_MIN + iz + 0.5)
        ref.current.setMatrixAt(i++, m)
      }
    }
    ref.current.instanceMatrix.needsUpdate = true
    ref.current.computeBoundingSphere()
  }, [])

  return (
    <group>
      <mesh position={[0, -PLATE / 2, 0]} receiveShadow>
        <boxGeometry args={[BOARD_SIZE * STUD, PLATE, BOARD_SIZE * STUD]} />
        <meshStandardMaterial color="#3d3833" roughness={0.92} metalness={0.04} />
      </mesh>
      <instancedMesh ref={ref} args={[studGeo, undefined, count]} receiveShadow castShadow>
        <meshStandardMaterial color="#4e4842" roughness={0.86} metalness={0.05} />
      </instancedMesh>
    </group>
  )
}
