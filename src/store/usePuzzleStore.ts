import { create } from 'zustand'
import {
  MAX_PART_COUNT,
  createStarterContainer,
  emptyCell,
  normalizeContainer,
} from '../data/container'
import { DEFAULT_COLOR } from '../data/colors'
import { SHAPE_MAP } from '../data/shapes'
import {
  BOARD_MAX,
  BOARD_MIN,
  buildOccupancy,
  canPlace,
  findDropPosition,
  mod4,
  orientedSize,
  rotateAnchor,
} from '../lib/grid'
import { loadSnapshot, saveSnapshot } from '../lib/storage'
import type {
  BlockedEvent,
  Brick,
  ContainerCell,
  PartPreset,
  Puzzle,
  PuzzleMode,
} from '../types'

const clampCount = (n: number) =>
  Math.min(MAX_PART_COUNT, Math.max(0, Math.round(Number(n) || 0)))

const EMPTY_BRICKS: Brick[] = []

let uidSeed = 0
const uid = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${(uidSeed++).toString(36)}${Math.floor(
    Math.random() * 1e6,
  ).toString(36)}`

function makePuzzle(name: string): Puzzle {
  const now = Date.now()
  return {
    id: uid('pz'),
    name,
    bricks: [],
    container: createStarterContainer(),
    mode: 'edit',
    createdAt: now,
    updatedAt: now,
  }
}

interface PuzzleState {
  puzzles: Puzzle[]
  activeId: string | null
  selectedBrickId: string | null
  currentColor: string
  blocked: BlockedEvent | null
  hydrated: boolean

  init: () => void
  createPuzzle: (name?: string) => void
  deletePuzzle: (id: string) => void
  renamePuzzle: (id: string, name: string) => void
  openPuzzle: (id: string) => void
  setMode: (mode: PuzzleMode) => void

  setCurrentColor: (hex: string) => void
  /** 往托盘（底板）里放一个方块，返回新方块 id；放不下返回 null */
  addBrick: (shapeId: string, color?: string) => string | null

  selectBrick: (id: string | null) => void
  moveSelected: (dx: number, dy: number, dz: number) => void
  rotateSelected: (axis: 'x' | 'y', dir: 1 | -1) => void
  deleteSelected: () => void
  clearBricks: () => void

  /** 容器：新增 / 编辑一个格子里的零件 */
  setContainerCell: (cellId: string, part: PartPreset | null) => void
  /** 容器：点非空格子 → 取一件放进托盘（数量 -1） */
  takeFromCell: (cellId: string) => boolean
  /** 容器：拖动格子里的东西换位（含空格） */
  swapContainerCells: (fromId: string, toId: string) => void
  /** 容器：底部新增一排空格子 */
  addContainerRow: () => void
  /** 容器：删掉最后一排（排内还有零件则不动） */
  removeContainerRow: () => void
}

let blockedSeq = 0

export const usePuzzleStore = create<PuzzleState>((set, get) => {
  /** 对当前打开的拼图做一次不可变更新 */
  const patchActive = (fn: (puzzle: Puzzle) => Puzzle | null) => {
    const state = get()
    const idx = state.puzzles.findIndex((p) => p.id === state.activeId)
    if (idx < 0) return null
    const next = fn(state.puzzles[idx])
    if (!next) return null
    const puzzles = state.puzzles.slice()
    puzzles[idx] = { ...next, updatedAt: Date.now() }
    set({ puzzles })
    return puzzles[idx]
  }

  /** 容器格子的通用不可变更新 */
  const patchContainer = (
    fn: (cells: ContainerCell[], cols: number) => ContainerCell[] | null,
  ) => {
    patchActive((p) => {
      const cells = fn(p.container.cells, p.container.cols)
      if (!cells) return null
      return { ...p, container: { ...p.container, cells } }
    })
  }

  const editable = () => {
    const state = get()
    const puzzle = state.puzzles.find((p) => p.id === state.activeId)
    return puzzle && puzzle.mode === 'edit' ? puzzle : null
  }

  const reject = (brickId: string, kind: 'move' | 'rotate', dir: [number, number, number]) => {
    set({ blocked: { brickId, kind, dir, seq: ++blockedSeq } })
  }

  /** 往托盘（底板）里落一个方块：自动找空位、自动选中，返回新方块 id */
  const placeBrick = (shapeId: string, color: string): string | null => {
    const puzzle = editable()
    if (!puzzle) return null
    const shape = SHAPE_MAP.get(shapeId)
    if (!shape) return null
    const size = orientedSize(shape, 0, 0)
    const { cells } = buildOccupancy(puzzle.bricks)
    const spot = findDropPosition(cells, size)
    if (!spot) return null
    const brick: Brick = {
      id: uid('bk'),
      shapeId,
      color,
      x: spot.x,
      y: spot.y,
      z: spot.z,
      rx: 0,
      ry: 0,
    }
    patchActive((p) => ({ ...p, bricks: [...p.bricks, brick] }))
    set({ selectedBrickId: brick.id, currentColor: color })
    return brick.id
  }

  return {
    puzzles: [],
    activeId: null,
    selectedBrickId: null,
    currentColor: DEFAULT_COLOR,
    blocked: null,
    hydrated: false,

    init: () => {
      const snap = loadSnapshot()
      if (snap && snap.puzzles.length > 0) {
        const puzzles = snap.puzzles.map((p) => ({
          ...p,
          container: normalizeContainer(p.container),
        }))
        const activeId =
          snap.activeId && puzzles.some((p) => p.id === snap.activeId)
            ? snap.activeId
            : puzzles[0].id
        set({ puzzles, activeId, hydrated: true })
      } else {
        const puzzle = makePuzzle('我的第一件作品')
        set({ puzzles: [puzzle], activeId: puzzle.id, hydrated: true })
      }
    },

    createPuzzle: (name) => {
      const puzzle = makePuzzle(name ?? `未命名拼图 ${get().puzzles.length + 1}`)
      set((s) => ({
        puzzles: [puzzle, ...s.puzzles],
        activeId: puzzle.id,
        selectedBrickId: null,
      }))
    },

    deletePuzzle: (id) => {
      const state = get()
      const puzzles = state.puzzles.filter((p) => p.id !== id)
      const activeId =
        state.activeId === id ? (puzzles[0]?.id ?? null) : state.activeId
      set({ puzzles, activeId, selectedBrickId: null })
    },

    renamePuzzle: (id, name) => {
      const trimmed = name.trim()
      if (!trimmed) return
      set((s) => ({
        puzzles: s.puzzles.map((p) => (p.id === id ? { ...p, name: trimmed } : p)),
      }))
    },

    openPuzzle: (id) => set({ activeId: id, selectedBrickId: null, blocked: null }),

    setMode: (mode) => {
      const updated = patchActive((p) => ({ ...p, mode }))
      if (updated) set({ selectedBrickId: null, blocked: null })
    },

    setCurrentColor: (hex) => {
      set({ currentColor: hex })
      const puzzle = editable()
      const brickId = get().selectedBrickId
      if (!puzzle || !brickId) return
      patchActive((p) => ({
        ...p,
        bricks: p.bricks.map((b) => (b.id === brickId ? { ...b, color: hex } : b)),
      }))
    },

    addBrick: (shapeId, color) => placeBrick(shapeId, color ?? get().currentColor),

    selectBrick: (id) => {
      const puzzle = editable()
      if (!puzzle) {
        set({ selectedBrickId: null })
        return
      }
      const brick = id ? puzzle.bricks.find((b) => b.id === id) : null
      // 选中方块时同步色板，方便直接改色
      set({ selectedBrickId: id, currentColor: brick ? brick.color : get().currentColor })
    },

    moveSelected: (dx, dy, dz) => {
      const puzzle = editable()
      const brickId = get().selectedBrickId
      if (!puzzle || !brickId) return
      const brick = puzzle.bricks.find((b) => b.id === brickId)
      if (!brick) return
      const shape = SHAPE_MAP.get(brick.shapeId)
      if (!shape) return
      const size = orientedSize(shape, brick.rx, brick.ry)
      const { cells } = buildOccupancy(puzzle.bricks)
      const nx = brick.x + dx
      const ny = brick.y + dy
      const nz = brick.z + dz

      if (!canPlace(cells, size, nx, ny, nz, brick.id)) {
        reject(brick.id, 'move', [dx, dy, dz])
        return
      }
      patchActive((p) => ({
        ...p,
        bricks: p.bricks.map((b) =>
          b.id === brickId ? { ...b, x: nx, y: ny, z: nz } : b,
        ),
      }))
    },

    rotateSelected: (axis, dir) => {
      const puzzle = editable()
      const brickId = get().selectedBrickId
      if (!puzzle || !brickId) return
      const brick = puzzle.bricks.find((b) => b.id === brickId)
      if (!brick) return
      const shape = SHAPE_MAP.get(brick.shapeId)
      if (!shape) return

      const oldSize = orientedSize(shape, brick.rx, brick.ry)
      const nrx = axis === 'x' ? mod4(brick.rx + dir) : brick.rx
      const nry = axis === 'y' ? mod4(brick.ry + dir) : brick.ry
      const newSize = orientedSize(shape, nrx, nry)
      const anchor = rotateAnchor(brick, oldSize, newSize)

      const { cells } = buildOccupancy(puzzle.bricks)
      if (!canPlace(cells, newSize, anchor.x, brick.y, anchor.z, brick.id)) {
        reject(brick.id, 'rotate', [axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, 0])
        return
      }
      patchActive((p) => ({
        ...p,
        bricks: p.bricks.map((b) =>
          b.id === brickId ? { ...b, rx: nrx, ry: nry, x: anchor.x, z: anchor.z } : b,
        ),
      }))
    },

    deleteSelected: () => {
      const brickId = get().selectedBrickId
      if (!brickId) return
      patchActive((p) => ({ ...p, bricks: p.bricks.filter((b) => b.id !== brickId) }))
      set({ selectedBrickId: null })
    },

    clearBricks: () => {
      if (!editable()) return
      patchActive((p) => ({ ...p, bricks: [] }))
      set({ selectedBrickId: null })
    },

    setContainerCell: (cellId, part) => {
      if (!editable()) return
      patchContainer((cells) =>
        cells.map((c) =>
          c.id === cellId
            ? part
              ? {
                  ...c,
                  shapeId: part.shapeId,
                  color: part.color,
                  count: clampCount(part.count),
                }
              : emptyCell(c.id)
            : c,
        ),
      )
    },

    takeFromCell: (cellId) => {
      const puzzle = editable()
      if (!puzzle) return false
      const cell = puzzle.container.cells.find((c) => c.id === cellId)
      if (!cell || !cell.shapeId || !cell.color || cell.count <= 0) return false
      if (!placeBrick(cell.shapeId, cell.color)) return false
      patchContainer((cells) =>
        cells.map((c) => (c.id === cellId ? { ...c, count: Math.max(0, c.count - 1) } : c)),
      )
      return true
    },

    swapContainerCells: (fromId, toId) => {
      if (fromId === toId || !editable()) return
      patchContainer((cells) => {
        const i = cells.findIndex((c) => c.id === fromId)
        const j = cells.findIndex((c) => c.id === toId)
        if (i < 0 || j < 0) return null
        // 交换内容但保留格子自身的 id，React key 不动 => 拖完不会闪一下
        const next = cells.slice()
        next[i] = { ...cells[j], id: cells[i].id }
        next[j] = { ...cells[i], id: cells[j].id }
        return next
      })
    },

    addContainerRow: () => {
      if (!editable()) return
      patchContainer((cells, cols) => [
        ...cells,
        ...Array.from({ length: cols }, () => emptyCell()),
      ])
    },

    removeContainerRow: () => {
      if (!editable()) return
      patchContainer((cells, cols) => {
        if (cells.length <= cols) return null
        const tail = cells.slice(cells.length - cols)
        // 最后一排还有零件时不允许删除，避免误删
        if (tail.some((c) => c.shapeId && c.count > 0)) return null
        return cells.slice(0, cells.length - cols)
      })
    },
  }
})

/** 当前打开的拼图 */
export const useActivePuzzle = () =>
  usePuzzleStore((s) => s.puzzles.find((p) => p.id === s.activeId) ?? null)

/** 当前拼图的方块数组（引用稳定，避免无谓重渲染） */
export const useActiveBricks = () =>
  usePuzzleStore((s) => s.puzzles.find((p) => p.id === s.activeId)?.bricks ?? EMPTY_BRICKS)

/** 当前拼图的零件容器 */
export const useActiveContainer = () =>
  usePuzzleStore((s) => s.puzzles.find((p) => p.id === s.activeId)?.container ?? null)

export const useEditMode = () =>
  usePuzzleStore((s) => {
    const puzzle = s.puzzles.find((p) => p.id === s.activeId)
    return puzzle ? puzzle.mode === 'edit' : false
  })

export const useSelectedBrickId = () => usePuzzleStore((s) => s.selectedBrickId)

/* 变更即落盘 */
usePuzzleStore.subscribe((state, prev) => {
  if (!state.hydrated) return
  if (state.puzzles !== prev.puzzles || state.activeId !== prev.activeId) {
    saveSnapshot({ puzzles: state.puzzles, activeId: state.activeId })
  }
})

export { BOARD_MAX, BOARD_MIN }
