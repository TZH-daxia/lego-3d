import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { PLATE, STUD } from '../../lib/grid'
import type { ShapeDef } from '../../types'

export interface BrickGeometry {
  body: THREE.BufferGeometry
  studs: THREE.BufferGeometry | null
}

const STUD_RADIUS = STUD * 0.3
const STUD_HEIGHT = STUD * 0.22

const cache = new Map<string, BrickGeometry>()
let studProto: THREE.CylinderGeometry | null = null

function studGeometry(): THREE.CylinderGeometry {
  if (!studProto) studProto = new THREE.CylinderGeometry(STUD_RADIUS, STUD_RADIUS, STUD_HEIGHT, 20)
  return studProto
}

/** 斜面剖面的水平投影长度（45° 斜面） */
function slopeRun(h: number, d: number) {
  return Math.min(d, h)
}

/**
 * 斜面：平顶占 depth = run，坡面朝 +z（默认相机所在方向），
 * 全高的一面在 -z。方向和 2D 等轴测图标完全一致。
 */
function makeSlope(w: number, h: number, d: number): THREE.BufferGeometry {
  const run = slopeRun(h, d)
  const profile = new THREE.Shape()
  profile.moveTo(d / 2, -h / 2)
  profile.lineTo(-d / 2, -h / 2)
  profile.lineTo(-d / 2, h / 2)
  profile.lineTo(-d / 2 + run, h / 2)
  profile.closePath()

  const geo = new THREE.ExtrudeGeometry(profile, { depth: w, bevelEnabled: false })
  geo.rotateY(-Math.PI / 2)
  geo.center()
  geo.computeVertexNormals()
  return geo
}

/** 生成某个造型的所有凸点几何（合并成一个 geometry，减少 draw call） */
function makeStuds(shape: ShapeDef, h: number, d: number): THREE.BufferGeometry | null {
  const proto = studGeometry()
  const y = h / 2 + STUD_HEIGHT / 2
  const parts: THREE.BufferGeometry[] = []

  if (shape.kind === 'round') {
    const g = proto.clone()
    g.translate(0, y, 0)
    parts.push(g)
  } else {
    // 斜面只有平顶（z 从 -d/2 到 -d/2+run）上才有凸点，凸点必须完整落在平顶内
    const isSlope = shape.kind === 'slope'
    const run = isSlope ? slopeRun(h, d) : 0
    for (let i = 0; i < shape.w; i++) {
      const sx = (i + 0.5 - shape.w / 2) * STUD
      for (let j = 0; j < shape.d; j++) {
        const sz = (j + 0.5 - shape.d / 2) * STUD
        if (isSlope && (sz - STUD_RADIUS < -d / 2 || sz + STUD_RADIUS > -d / 2 + run)) continue
        const g = proto.clone()
        g.translate(sx, y, sz)
        parts.push(g)
      }
    }
  }
  if (parts.length === 0) return null
  return mergeGeometries(parts, false) ?? null
}

/** 按造型缓存几何体，全局复用 */
export function getBrickGeometry(shape: ShapeDef): BrickGeometry {
  const hit = cache.get(shape.id)
  if (hit) return hit

  const w = shape.w * STUD
  const h = shape.h * PLATE
  const d = shape.d * STUD

  let body: THREE.BufferGeometry
  if (shape.kind === 'round') {
    const r = Math.min(w, d) / 2
    body = new THREE.CylinderGeometry(r, r, h, 40)
  } else if (shape.kind === 'slope') {
    body = makeSlope(w, h, d)
  } else {
    const radius = Math.min(0.09, h / 3.2, w / 8, d / 8)
    body = new RoundedBoxGeometry(w, h, d, 3, radius)
  }

  const studs = shape.kind === 'tile' ? null : makeStuds(shape, h, d)
  const entry: BrickGeometry = { body, studs }
  cache.set(shape.id, entry)
  return entry
}
