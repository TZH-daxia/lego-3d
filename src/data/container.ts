import { COLORS } from './colors'
import { SHAPES_CATALOG } from './shapes'
import type { Container, ContainerCell } from '../types'

/** 一排固定 8 格，零件按品类分块从左到右、从上到下铺 */
export const CONTAINER_COLS = 8

let cellSeed = 0
export const newCellId = () =>
  `ct_${Date.now().toString(36)}${(cellSeed++).toString(36)}${Math.floor(
    Math.random() * 1e6,
  ).toString(36)}`

export const emptyCell = (id: string = newCellId()): ContainerCell => ({
  id,
  shapeId: null,
  color: null,
})

/** 每个格子的随机颜色（经典乐高 12 色里抽一个） */
const randomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)].hex

/** 零件盒一共要几排：造型数量除以列数向上取整 */
const rowsFor = (count: number) => Math.max(1, Math.ceil(count / CONTAINER_COLS))

/**
 * 零件盒 =「全部造型的目录」。
 *
 * - 所有造型都摆出来，**先砖类、再板类、最后特殊件**，块内按常用度（`SHAPES_CATALOG`）
 * - 一格一个造型，颜色随机
 * - 格子不够就自动加一排，多出来的尾巴是空格（不可点）
 * - 没有数量概念：格子里是"无限取用"的模子
 */
export function buildCatalogContainer(colorOf?: (shapeId: string) => string): Container {
  const shapes = SHAPES_CATALOG
  const total = rowsFor(shapes.length) * CONTAINER_COLS
  const cells: ContainerCell[] = []
  for (let i = 0; i < total; i++) {
    const shape = shapes[i]
    cells.push(
      shape
        ? {
            id: newCellId(),
            shapeId: shape.id,
            color: colorOf?.(shape.id) ?? randomColor(),
          }
        : emptyCell(),
    )
  }
  return { cols: CONTAINER_COLS, cells }
}

export const createStarterContainer = () => buildCatalogContainer()

/**
 * 载入存档时的兜底：
 * - 造型列表对不上（旧版本的手工零件盒、或者造型表新增了零件）→ 重建目录；
 *   能认出老造型的沿用它的颜色，认不出的才随机，避免每次加载都变色
 * - 对得上就原样保留，只补全缺失的 id / 颜色
 */
export function normalizeContainer(raw: unknown): Container {
  const old = raw && typeof raw === 'object' ? (raw as Container) : null
  const cells = Array.isArray(old?.cells) ? old.cells : []

  const expected = SHAPES_CATALOG.map((s) => s.id)
  const total = rowsFor(expected.length) * CONTAINER_COLS
  const matchesCatalog =
    cells.length === total &&
    expected.every((id, i) => (cells[i]?.shapeId ?? null) === id) &&
    cells.slice(expected.length).every((c) => !c?.shapeId)

  if (matchesCatalog) {
    return {
      cols: CONTAINER_COLS,
      cells: cells.map((c) => ({
        id: c.id ?? newCellId(),
        shapeId: c.shapeId ?? null,
        color: c.color ?? randomColor(),
      })),
    }
  }

  const colorByShape = new Map<string, string>()
  for (const c of cells) {
    if (c?.shapeId && c.color) colorByShape.set(c.shapeId, c.color)
  }
  return buildCatalogContainer((shapeId) => colorByShape.get(shapeId) ?? randomColor())
}
