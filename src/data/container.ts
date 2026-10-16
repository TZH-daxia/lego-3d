import { COLORS } from './colors'
import type { Container, ContainerCell, PartPreset } from '../types'

/** 一排固定 8 格 */
export const CONTAINER_COLS = 8
/** 初始 3 排 */
export const CONTAINER_ROWS = 3
/** 单格数量上限 */
export const MAX_PART_COUNT = 99

let cellSeed = 0
export const newCellId = () =>
  `ct_${Date.now().toString(36)}${(cellSeed++).toString(36)}${Math.floor(
    Math.random() * 1e6,
  ).toString(36)}`

export const emptyCell = (id: string = newCellId()): ContainerCell => ({
  id,
  shapeId: null,
  color: null,
  count: 0,
})

/** 空格子 = 没有造型，或者数量已经取完 */
export const isEmptyCell = (cell: ContainerCell) => !cell.shapeId || cell.count <= 0

/**
 * 生成容器。`presets` 按顺序填入最前面的格子，其余留空。
 */
export function buildContainer(rows: number, presets: PartPreset[] = []): Container {
  const cells: ContainerCell[] = []
  const total = Math.max(rows, 1) * CONTAINER_COLS
  for (let i = 0; i < total; i++) {
    const preset = presets[i]
    cells.push(
      preset
        ? { id: newCellId(), shapeId: preset.shapeId, color: preset.color, count: preset.count }
        : emptyCell(),
    )
  }
  return { cols: CONTAINER_COLS, cells }
}

const color = (index: number) => COLORS[index].hex

/**
 * 新作品的初始零件盒：前两排填满常用件（砖 / 薄板 / 圆柱 / 平滑片 / 斜面），
 * 第三排留空，打开就能直接搭。
 */
export const STARTER_PRESETS: PartPreset[] = [
  { shapeId: 'b2x2', color: color(0), count: 4 },
  { shapeId: 'b1x2', color: color(4), count: 8 },
  { shapeId: 'b1x1', color: color(2), count: 8 },
  { shapeId: 'p2x4', color: color(3), count: 4 },
  { shapeId: 'r1x1', color: color(10), count: 6 },
  { shapeId: 's2x2', color: color(8), count: 2 },
  { shapeId: 'b1x4', color: color(1), count: 4 },
  { shapeId: 'b2x4', color: color(9), count: 3 },
  { shapeId: 't1x1', color: color(11), count: 6 },
  { shapeId: 'rp2x2', color: color(7), count: 2 },
  { shapeId: 'p1x4', color: color(5), count: 8 },
  { shapeId: 's2x4', color: color(6), count: 2 },
  { shapeId: 'b2x3', color: color(3), count: 3 },
  { shapeId: 'p1x2', color: color(1), count: 8 },
  { shapeId: 'p2x6', color: color(9), count: 2 },
  { shapeId: 'r2x2', color: color(7), count: 2 },
]

export const createStarterContainer = () => buildContainer(CONTAINER_ROWS, STARTER_PRESETS)

/** 上一版的初始零件盒（6 件）：用来识别"用户还没动过的旧存档"并升级 */
const LEGACY_STARTER: [string, number, number][] = [
  ['b2x2', 0, 4],
  ['b1x2', 4, 6],
  ['b1x1', 2, 8],
  ['p2x4', 3, 4],
  ['r1x1', 10, 6],
  ['s2x2', 8, 2],
]

const isLegacyStarter = (cells: ContainerCell[]) => {
  if (cells.length < LEGACY_STARTER.length) return false
  return cells.every((cell, index) => {
    if (index >= LEGACY_STARTER.length) return !cell.shapeId || cell.count <= 0
    const [shapeId, colorIndex, count] = LEGACY_STARTER[index]
    return cell.shapeId === shapeId && cell.color === color(colorIndex) && cell.count === count
  })
}

/** 补齐旧数据（早于容器功能保存的存档没有 container 字段） */
export function normalizeContainer(raw: unknown): Container {
  if (!raw || typeof raw !== 'object') return createStarterContainer()
  const container = raw as Container
  if (!Array.isArray(container.cells) || container.cells.length === 0) {
    return createStarterContainer()
  }
  const cells: ContainerCell[] = container.cells.map((cell) => ({
    id: cell?.id ?? newCellId(),
    shapeId: cell?.shapeId ?? null,
    color: cell?.color ?? null,
    count: Math.min(MAX_PART_COUNT, Math.max(0, Number(cell?.count) || 0)),
  }))
  // 老存档没动过零件盒 → 换成新的默认零件，已经改过的原样保留
  if (isLegacyStarter(cells)) return createStarterContainer()

  // 列数统一成当前值（旧存档是 6 列），并补齐到当前排数的整数倍
  const cols = CONTAINER_COLS
  const next = cells.slice()
  const minimum = CONTAINER_ROWS * cols
  while (next.length < minimum) next.push(emptyCell())
  while (next.length % cols !== 0) next.push(emptyCell())
  return { cols, cells: next }
}
