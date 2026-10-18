/** 方块造型类型 */
export type ShapeKind = 'brick' | 'plate' | 'round' | 'slope' | 'tile'

/** 调色板分组 */
export type ShapeGroup = '砖块' | '薄板' | '特殊件'

/**
 * 方块造型定义。
 * 所有尺寸都以"格"为单位：
 *  - w / d 单位为凸点（stud）间距
 *  - h 单位为板高（plate），一个标准砖 = 3 个板高
 */
export interface ShapeDef {
  id: string
  label: string
  desc: string
  kind: ShapeKind
  group: ShapeGroup
  w: number
  d: number
  h: number
}

/** 场景中的一个乐高方块实例 */
export interface Brick {
  id: string
  shapeId: string
  /** 颜色 hex */
  color: string
  /** 锚点（最小角）格点坐标 */
  x: number
  y: number
  z: number
  /** 上下旋转，90° 步进（绕 X 轴），0..3 */
  rx: number
  /** 左右旋转，90° 步进（绕 Y 轴），0..3 */
  ry: number
}

/**
 * 零件盒的一个格子：一格 = 一个造型 + 一个颜色，取用不限量。
 * `shapeId === null` 表示空格子（造型数量凑不满一排时的尾巴）。
 */
export interface ContainerCell {
  id: string
  shapeId: string | null
  color: string | null
}

/** 底部容器：固定 `cols` 列，格子数即总格数（排数 = cells.length / cols） */
export interface Container {
  cols: number
  cells: ContainerCell[]
}

/** 编辑模式：可新增/移动/旋转；观察模式：只能看 */
export type PuzzleMode = 'edit' | 'view'

export interface Puzzle {
  id: string
  name: string
  bricks: Brick[]
  container: Container
  mode: PuzzleMode
  createdAt: number
  updatedAt: number
}

/** 移动 / 旋转被占用时的提示事件 */
export interface BlockedEvent {
  brickId: string
  kind: 'move' | 'rotate'
  dir: [number, number, number]
  seq: number
}
