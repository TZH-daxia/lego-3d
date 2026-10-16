import { SHAPE_MAP } from '../data/shapes'
import type { Brick, ShapeDef } from '../types'

/** 1 个凸点间距 = 1 世界单位 */
export const STUD = 1
/** 1 个板高 = 0.42 世界单位（真实乐高约 0.4） */
export const PLATE = 0.42

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
}

/** 一次性构建占位索引，移动/旋转检测都是 O(占地面积) */
export function buildOccupancy(bricks: Brick[]): Occupancy {
  const cells = new Map<string, string>()
  const sizes = new Map<string, Size>()
  for (const b of bricks) {
    const shape = SHAPE_MAP.get(b.shapeId)
    if (!shape) continue
    const s = orientedSize(shape, b.rx, b.ry)
    sizes.set(b.id, s)
    for (let dx = 0; dx < s.x; dx++) {
      for (let dy = 0; dy < s.y; dy++) {
        for (let dz = 0; dz < s.z; dz++) {
          cells.set(cellKey(b.x + dx, b.y + dy, b.z + dz), b.id)
        }
      }
    }
  }
  return { cells, sizes }
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
 * 为新方块找一个落点。
 *
 * 先"扫地"再"叠高"：从最底层开始，每层按「底板中心 → 外圈」的环形顺序找第一个空位。
 * 这样新增的方块会先铺满底板、再往上叠，不会在中心堆成一根又高又难点的高塔。
 */
export function findDropPosition(
  cells: Map<string, string>,
  size: Size,
): { x: number; y: number; z: number } | null {
  const cx = -Math.floor(size.x / 2)
  const cz = -Math.floor(size.z / 2)
  for (let y = 0; y + size.y <= MAX_LEVEL; y++) {
    for (let r = 0; r <= BOARD_SIZE; r++) {
      for (const [x, z] of ring(cx, cz, r)) {
        if (canPlace(cells, size, x, y, z)) return { x, y, z }
      }
    }
  }
  return null
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

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
