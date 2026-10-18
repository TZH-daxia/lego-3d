import { SHAPE_MAP } from '../data/shapes'
import type { Brick, ShapeDef } from '../types'

/** 1 个凸点间距 = 1 世界单位 */
export const STUD = 1
/** 1 个板高 = 0.42 世界单位（真实乐高约 0.4） */
export const PLATE = 0.42
/**
 * 凸点半径 / 凸点高度（世界单位），底板和所有零件的凸点共用这套数值。
 *
 * 半径 0.27 是刻意收窄的：圆柱件外径按真实比例取 0.9875×格宽（Ø15.8 / 16mm），
 * 它底下 4 个格子中心（斜向 0.707）的凸点最远伸到 0.977，
 * 稳稳收在圆柱轮廓内，不会从圆件边缘冒出来。
 */
export const STUD_R = STUD * 0.27
export const STUD_H = STUD * 0.2

/**
 * 斜面平顶的进深（世界单位）。
 *
 * 坡面固定按 45° 设计（水平进深 = 竖直落差 = 砖高），剩下的才是平顶；
 * 但至少留 1 个凸点的宽度，否则 2×2 斜面顶上就一颗凸点都放不下。
 */
export const slopeFlat = (hWorld: number, dWorld: number) =>
  Math.max(STUD, dWorld - hWorld)

/** 底板为 32×32 凸点 */
export const BOARD_SIZE = 32
export const BOARD_MIN = -BOARD_SIZE / 2
export const BOARD_MAX = BOARD_SIZE / 2 - 1

/** 最高 48 个板高（16 层标准砖） */
export const MAX_LEVEL = 48

export interface Size {
  x: number
  y: number
  z: number
}

export const mod4 = (n: number) => ((n % 4) + 4) % 4

/**
 * 求出方块在 90° 步进旋转后的轴对齐包围盒尺寸（格点单位）。
 * 场景中的旋转顺序为 R = Ry * Rx，所以先算绕 X 轴（上下旋转）再算绕 Y 轴（左右旋转）。
 */
export function orientedSize(shape: ShapeDef, rx: number, ry: number): Size {
  let x = shape.w
  let y = shape.h
  let z = shape.d
  for (let i = mod4(rx); i > 0; i--) {
    const t = y
    y = z
    z = t
  }
  for (let i = mod4(ry); i > 0; i--) {
    const t = x
    x = z
    z = t
  }
  return { x, y, z }
}

export const cellKey = (x: number, y: number, z: number) => `${x},${y},${z}`

export interface Occupancy {
  /** 每个格点被哪个方块占据 */
  cells: Map<string, string>
  /** 每个方块旋转后的包围盒尺寸 */
  sizes: Map<string, Size>
  /** 方块本身，用于反查造型 / 朝向（判断顶面有没有凸点） */
  byId: Map<string, Brick>
}

/** 一次性构建占位索引，移动/旋转检测都是 O(占地面积) */
export function buildOccupancy(bricks: Brick[]): Occupancy {
  const cells = new Map<string, string>()
  const sizes = new Map<string, Size>()
  const byId = new Map<string, Brick>()
  for (const b of bricks) {
    const shape = SHAPE_MAP.get(b.shapeId)
    if (!shape) continue
    const s = orientedSize(shape, b.rx, b.ry)
    sizes.set(b.id, s)
    byId.set(b.id, b)
    for (let dx = 0; dx < s.x; dx++) {
      for (let dy = 0; dy < s.y; dy++) {
        for (let dz = 0; dz < s.z; dz++) {
          cells.set(cellKey(b.x + dx, b.y + dy, b.z + dz), b.id)
        }
      }
    }
  }
  return { cells, sizes, byId }
}

/** 目标位置是否可放置：不越界、不越层、不与他人重叠 */
export function canPlace(
  cells: Map<string, string>,
  size: Size,
  x: number,
  y: number,
  z: number,
  ignoreId?: string,
): boolean {
  if (y < 0 || y + size.y > MAX_LEVEL) return false
  if (x < BOARD_MIN || z < BOARD_MIN) return false
  if (x + size.x - 1 > BOARD_MAX || z + size.z - 1 > BOARD_MAX) return false
  for (let dx = 0; dx < size.x; dx++) {
    for (let dy = 0; dy < size.y; dy++) {
      for (let dz = 0; dz < size.z; dz++) {
        const owner = cells.get(cellKey(x + dx, y + dy, z + dz))
        if (owner !== undefined && owner !== ignoreId) return false
      }
    }
  }
  return true
}

function* ring(cx: number, cz: number, r: number): Generator<[number, number]> {
  if (r === 0) {
    yield [cx, cz]
    return
  }
  for (let dx = -r; dx <= r; dx++) {
    yield [cx + dx, cz - r]
    yield [cx + dx, cz + r]
  }
  for (let dz = -r + 1; dz <= r - 1; dz++) {
    yield [cx - r, cz + dz]
    yield [cx + r, cz + dz]
  }
}

/**
 * 某块方块的顶面在某个世界格点上有没有凸点。
 * 「底面凹槽对准凸点」就是能不能组装的全部判据，所以这里按真实件型给：
 * - 平滑片（tile）：整块没有凸点，上面放不了东西
 * - 圆柱（round）：只有正中间一颗凸点，落在格子角上，1×1 才正好对得上
 * - 斜面（slope）：只有平顶那段有凸点，且顶面必须朝上（翻转后顶面成了侧壁）
 * - 砖 / 薄板：每格都有凸点
 * - 任何被上下翻转（rx%4 !== 0）的件，顶面不再朝上，按没有凸点处理
 */
export function hasStudAt(occ: Occupancy, ownerId: string, wx: number, wz: number): boolean {
  const owner = occ.byId.get(ownerId)
  const size = occ.sizes.get(ownerId)
  const shape = owner ? SHAPE_MAP.get(owner.shapeId) : undefined
  if (!owner || !size || !shape) return false

  // 翻转（含倒扣）之后没有朝上的凸点
  if (mod4(owner.rx) !== 0) return false
  if (shape.kind === 'tile') return false
  if (shape.kind === 'round') return size.x === 1 && size.z === 1

  if (shape.kind === 'slope') {
    // 坡面朝局部 +z，绕 Y 转过之后朝世界 (sinφ, cosφ)
    const flat = slopeFlat(shape.h * PLATE, shape.d * STUD)
    const phi = mod4(owner.ry) * (Math.PI / 2)
    const dx = Math.sin(phi)
    const dz = Math.cos(phi)
    const extent = Math.abs(dx) * size.x + Math.abs(dz) * size.z
    const cx = owner.x + size.x / 2
    const cz = owner.z + size.z / 2
    // 格点中心沿坡面方向的投影，必须落在平顶范围内（和几何里放凸点的判据一致）
    const proj = (wx + 0.5 - cx) * dx + (wz + 0.5 - cz) * dz
    return proj >= -extent / 2 + 0.02 && proj <= -extent / 2 + flat - 0.02
  }

  return true
}

/**
 * 底面能不能扣在下面那层上：
 * 落点下方每个格子都必须有凸点（y === 0 时由底盘直接托住）。
 * 只要有一格悬空或者压在平滑片 / 圆柱边缘上，就不算组装上。
 */
export function hasSupport(
  occ: Occupancy,
  size: Size,
  x: number,
  y: number,
  z: number,
  ignoreId?: string,
): boolean {
  if (y === 0) return true
  for (let dx = 0; dx < size.x; dx++) {
    for (let dz = 0; dz < size.z; dz++) {
      const cx = x + dx
      const cz = z + dz
      const owner = occ.cells.get(cellKey(cx, y - 1, cz))
      // 自己不能当自己的支撑：否则"上升"会把方块抬到空中变成悬空块
      if (!owner || owner === ignoreId) return false
      if (!hasStudAt(occ, owner, cx, cz)) return false
    }
  }
  return true
}

/** 能不能放：不越界、不穿模、且底面能扣上 */
export function canBuild(
  occ: Occupancy,
  size: Size,
  x: number,
  y: number,
  z: number,
  ignoreId?: string,
): boolean {
  return (
    canPlace(occ.cells, size, x, y, z, ignoreId) &&
    hasSupport(occ, size, x, y, z, ignoreId)
  )
}

/**
 * 为新方块找一个落点。
 *
 * 先"扫地"再"叠高"：从最底层开始，每层按「底板中心 → 外圈」的环形顺序
 * 找第一个既不穿模、底面又能扣上的位置。
 * 这样新增的方块会先铺满底板、再往上叠，不会在中心堆成一根又高又难点的高塔。
 */
export function findDropPosition(
  occ: Occupancy,
  size: Size,
): { x: number; y: number; z: number } | null {
  const cx = -Math.floor(size.x / 2)
  const cz = -Math.floor(size.z / 2)
  for (let y = 0; y + size.y <= MAX_LEVEL; y++) {
    for (let r = 0; r <= BOARD_SIZE; r++) {
      for (const [x, z] of ring(cx, cz, r)) {
        if (canBuild(occ, size, x, y, z)) return { x, y, z }
      }
    }
  }
  return null
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

/** 在同一层里绕着原位置由近到远找一个能扣上的空位 */
function nearestAtLevel(
  occ: Occupancy,
  size: Size,
  x: number,
  y: number,
  z: number,
): { x: number; y: number; z: number } | null {
  for (let r = 1; r <= BOARD_SIZE * 2; r++) {
    for (const [nx, nz] of ring(x, z, r)) {
      if (canBuild(occ, size, nx, y, nz)) return { x: nx, y, z: nz }
    }
  }
  return null
}

/**
 * 存档兜底：只修"互相穿插"的方块（旧规则更宽松，可能存下过重叠的搭法）。
 *
 * 悬空**不算非法** —— 手动抬起方块再挪到别的垛子上是正常玩法，
 * 所以这里不再按"必须有支撑"去动它们，只处理压在一起的情况：
 *   1. 原地不与他人重叠 → 不动
 *   2. 否则沿竖列往下落，落到第一个能扣上的高度
 *   3. 还不行 → 在原来那层附近就近找位，再不行才另找空地
 * 合法存档跑一遍不会有任何改动（幂等）。
 */
export function reseatBricks(bricks: Brick[]): Brick[] {
  // 没有穿插就原样返回，别为老存档的兜底白白消耗加载时间
  const snapshot = buildOccupancy(bricks)
  const broken = bricks.some((b) => {
    const size = snapshot.sizes.get(b.id)
    if (!size) return false
    return !canPlace(snapshot.cells, size, b.x, b.y, b.z, b.id)
  })
  if (!broken) return bricks

  const ordered = bricks
    .map((b, i) => ({ b, i }))
    .sort((p, q) => p.b.y - q.b.y || p.i - q.i)
    .map((p) => p.b)

  const result: Brick[] = []
  for (const brick of ordered) {
    const shape = SHAPE_MAP.get(brick.shapeId)
    if (!shape) {
      result.push(brick)
      continue
    }
    const occ = buildOccupancy(result)
    const size = orientedSize(shape, brick.rx, brick.ry)
    // 只要不重叠就原样保留（悬空是允许的手动操作）
    if (canPlace(occ.cells, size, brick.x, brick.y, brick.z)) {
      result.push(brick)
      continue
    }

    let fixed: Brick | null = null
    for (let ny = brick.y - 1; ny >= 0; ny--) {
      if (canBuild(occ, size, brick.x, ny, brick.z)) {
        fixed = { ...brick, y: ny }
        break
      }
    }
    if (!fixed) {
      const spot = nearestAtLevel(occ, size, brick.x, brick.y, brick.z)
      if (spot) fixed = { ...brick, ...spot }
    }
    if (!fixed) {
      const spot = findDropPosition(occ, size)
      if (spot) fixed = { ...brick, ...spot }
    }
    result.push(fixed ?? brick)
  }
  return result
}

/** 旋转后保持水平中心不动，并夹到底板范围内 */
export function rotateAnchor(
  brick: Brick,
  oldSize: Size,
  newSize: Size,
): { x: number; z: number } {
  const centerX = brick.x + oldSize.x / 2
  const centerZ = brick.z + oldSize.z / 2
  return {
    x: clamp(Math.round(centerX - newSize.x / 2), BOARD_MIN, BOARD_MAX - newSize.x + 1),
    z: clamp(Math.round(centerZ - newSize.z / 2), BOARD_MIN, BOARD_MAX - newSize.z + 1),
  }
}

/** 格点坐标 -> 世界坐标（方块几何体的中心点） */
export function worldCenter(
  x: number,
  y: number,
  z: number,
  size: Size,
): [number, number, number] {
  return [x + size.x / 2, (y + size.y / 2) * PLATE, z + size.z / 2]
}

/** 格点尺寸 -> 世界尺寸 */
export function worldSize(size: Size): [number, number, number] {
  return [size.x * STUD, size.y * PLATE, size.z * STUD]
}

/**
 * 渲染用的逐轴缩放。
 *
 * 凸点间距（STUD）和板高（PLATE）是两套单位，一旦绕 X 轴翻转，
 * 造型的「高」会变成「进深」，几何体的自然尺寸就和占位盒对不上，
 * 直接渲染会戳进地面 / 下层零件（穿模）。这里算出把旋转后的几何体
 * 塞回占位盒所需的缩放（局部坐标系，交给 pitch 层使用）。
 */
export function brickFitScale(
  shape: ShapeDef,
  rx: number,
  ry: number,
): [number, number, number] {
  const size = orientedSize(shape, rx, ry)

  // 旋转后几何体的自然尺寸（世界轴）
  let nx = shape.w * STUD
  let ny = shape.h * PLATE
  let nz = shape.d * STUD
  for (let i = mod4(rx); i > 0; i--) {
    const t = ny
    ny = nz
    nz = t
  }
  for (let i = mod4(ry); i > 0; i--) {
    const t = nx
    nx = nz
    nz = t
  }

  const worldScale: [number, number, number] = [
    (size.x * STUD) / nx,
    (size.y * PLATE) / ny,
    (size.z * STUD) / nz,
  ]

  // 再按相反顺序换回造型自身的局部轴
  let lx = worldScale[0]
  let ly = worldScale[1]
  let lz = worldScale[2]
  for (let i = mod4(ry); i > 0; i--) {
    const t = lx
    lx = lz
    lz = t
  }
  for (let i = mod4(rx); i > 0; i--) {
    const t = ly
    ly = lz
    lz = t
  }
  return [lx, ly, lz]
}
