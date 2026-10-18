import type { ShapeDef } from '../types'

const BRICK_H = 3

const brick = (w: number, d: number): ShapeDef => ({
  id: `b${w}x${d}`,
  label: `${w}×${d}`,
  desc: `${w}×${d} 标准砖（3 板高）`,
  kind: 'brick',
  group: '砖块',
  w,
  d,
  h: BRICK_H,
})

const plate = (w: number, d: number): ShapeDef => ({
  id: `p${w}x${d}`,
  label: `${w}×${d}`,
  desc: `${w}×${d} 薄板（1 板高）`,
  kind: 'plate',
  group: '薄板',
  w,
  d,
  h: 1,
})

const round = (w: number): ShapeDef => ({
  id: `r${w}x${w}`,
  label: `${w}×${w}`,
  desc: `${w}×${w} 圆柱砖`,
  kind: 'round',
  group: '特殊件',
  w,
  d: w,
  h: BRICK_H,
})

const roundPlate = (w: number): ShapeDef => ({
  id: `rp${w}x${w}`,
  label: `${w}×${w}`,
  desc: `${w}×${w} 圆薄板`,
  kind: 'round',
  group: '特殊件',
  w,
  d: w,
  h: 1,
})

const tile = (w: number, d: number): ShapeDef => ({
  id: `t${w}x${d}`,
  label: `${w}×${d}`,
  desc: `${w}×${d} 平滑片（无凸点）`,
  kind: 'tile',
  group: '特殊件',
  w,
  d,
  h: 1,
})

const slope = (w: number, d: number): ShapeDef => ({
  id: `s${w}x${d}`,
  label: `${w}×${d}`,
  desc: `${w}×${d} 斜面砖`,
  kind: 'slope',
  group: '特殊件',
  w,
  d,
  h: BRICK_H,
})

/** 调色板中提供的全部方块造型，用户只能从这里取件 */
export const SHAPES: ShapeDef[] = [
  brick(1, 1),
  brick(1, 2),
  brick(1, 3),
  brick(1, 4),
  brick(1, 6),
  brick(1, 8),
  brick(2, 2),
  brick(2, 3),
  brick(2, 4),
  brick(2, 6),
  brick(4, 4),
  plate(1, 2),
  plate(1, 4),
  plate(2, 2),
  plate(2, 3),
  plate(2, 4),
  plate(2, 6),
  plate(2, 8),
  plate(4, 4),
  plate(4, 8),
  round(1),
  round(2),
  roundPlate(1),
  roundPlate(2),
  tile(1, 1),
  tile(1, 2),
  tile(2, 2),
  slope(2, 2),
  slope(2, 4),
]

export const SHAPE_MAP: Map<string, ShapeDef> = new Map(SHAPES.map((s) => [s.id, s]))

export const SHAPE_GROUPS = ['砖块', '薄板', '特殊件'] as const

/**
 * 零件的常用度排序（零件盒按这个顺序铺开）。
 *
 * 参考套装零件用量统计：使用频率最高的依次是
 * 2×4 基础砖 → 1×4 / 1×2 砖 → 各类板件与薄片 → 1×1 圆柱 → 斜面 → 其它，
 * 大尺寸（2×8 / 4×8 / 1×6 / 1×8）出现得最少，所以排在最后。
 */
export const SHAPE_POPULARITY: string[] = [
  'b2x4', // 2×4 砖：最常见的基础件
  'p2x4', // 2×4 薄板：现代套装里用量最大的板
  'b1x4',
  'b1x2',
  'b2x2',
  'p1x2',
  'p2x2',
  't1x2',
  'b1x1',
  'p1x4',
  'rp1x1', // 1×1 圆薄板
  'b2x3',
  'b2x6',
  's2x2',
  'p2x6',
  'r1x1',
  't1x1',
  'p2x3',
  'b1x3',
  's2x4',
  'r2x2',
  'rp2x2',
  't2x2',
  'p4x4',
  'b4x4',
  'p2x8',
  'p4x8',
  'b1x6',
  'b1x8',
]

const POPULARITY_RANK = new Map(SHAPE_POPULARITY.map((id, i) => [id, i]))

/** 零件盒的品类顺序：先砖类、再板类、最后特殊件（平滑片 / 圆柱 / 斜面） */
const KIND_ORDER: Record<ShapeDef['kind'], number> = {
  brick: 0,
  plate: 1,
  tile: 2,
  round: 3,
  slope: 4,
}

/** 零件盒展示顺序：先按品类分块，块内按常用度 */
export const SHAPES_CATALOG: ShapeDef[] = SHAPES.slice().sort((a, b) => {
  const byKind = KIND_ORDER[a.kind] - KIND_ORDER[b.kind]
  if (byKind !== 0) return byKind
  const ra = POPULARITY_RANK.get(a.id) ?? Number.MAX_SAFE_INTEGER
  const rb = POPULARITY_RANK.get(b.id) ?? Number.MAX_SAFE_INTEGER
  return ra - rb
})
