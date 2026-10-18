import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { PLATE, STUD, STUD_H, STUD_R, slopeFlat } from '../../lib/grid'
import type { ShapeDef } from '../../types'

export interface BrickGeometry {
  body: THREE.BufferGeometry
  studs: THREE.BufferGeometry | null
}

const STUD_RADIUS = STUD_R
const STUD_HEIGHT = STUD_H

/**
 * 圆柱件直径比占位盒小一圈：真实乐高 2×2 圆砖 Ø15.8mm、格距 16mm ⇒ 0.9875。
 * 相邻两个圆件之间因此留出 0.025 的缝（贴着看也不会像"边缘插进对方"），
 * 同时把身下 4 个格子中心的凸点（斜向 0.707 + 0.27 = 0.977）整个罩住。
 */
const ROUND_INSET = 0.9875

const cache = new Map<string, BrickGeometry>()
let studProto: THREE.CylinderGeometry | null = null

function studGeometry(): THREE.CylinderGeometry {
  if (!studProto) studProto = new THREE.CylinderGeometry(STUD_RADIUS, STUD_RADIUS, STUD_HEIGHT, 20)
  return studProto
}

/**
 * 斜面：平顶占 depth = slopeFlat()（至少 1 个凸点宽），坡面朝 +z（默认相机所在方向），
 * 坡脚落在 +z 底边、坡面固定 45°，全高的一面在 -z。
 * 方向和 2D 等轴测图标完全一致。
 */
function makeSlope(w: number, h: number, d: number): THREE.BufferGeometry {
  const flat = slopeFlat(h, d)
  const profile = new THREE.Shape()
  profile.moveTo(d / 2, -h / 2)
  profile.lineTo(-d / 2, -h / 2)
  profile.lineTo(-d / 2, h / 2)
  profile.lineTo(-d / 2 + flat, h / 2)
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
    // 斜面只有平顶（z 从 -d/2 到 -d/2+flat）上才有凸点
    const isSlope = shape.kind === 'slope'
    const flat = isSlope ? slopeFlat(h, d) : 0
    for (let i = 0; i < shape.w; i++) {
      const sx = (i + 0.5 - shape.w / 2) * STUD
      for (let j = 0; j < shape.d; j++) {
        const sz = (j + 0.5 - shape.d / 2) * STUD
        // 以凸点中心是否落在平顶里为准（平顶至少 1 个凸点宽，不会骑在坡口上）
        if (isSlope && (sz < -d / 2 + 0.02 || sz > -d / 2 + flat - 0.02)) continue
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
    // 直筒（真实圆件几乎不收口），直径按 0.9875 略小于占位盒
    const r = (Math.min(w, d) / 2) * ROUND_INSET
    body = new THREE.CylinderGeometry(r, r, h, 48)
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
