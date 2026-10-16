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
