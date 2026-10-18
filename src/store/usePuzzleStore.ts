import { create } from 'zustand'
import { createStarterContainer, normalizeContainer } from '../data/container'
import { DEFAULT_COLOR } from '../data/colors'
import { DOG_PUZZLE_ID, createDogPuzzle } from '../data/samples'
import { SHAPE_MAP } from '../data/shapes'
import {
  BOARD_MAX,
  BOARD_MIN,
  buildOccupancy,
  canPlace,
  findDropPosition,
  hasSupport,
  mod4,
  orientedSize,
  reseatBricks,
  rotateAnchor,
} from '../lib/grid'
import { loadSnapshot, saveSnapshot } from '../lib/storage'
import type { BlockedEvent, Brick, Puzzle, PuzzleMode } from '../types'

/** 示例小狗只送一次：删掉之后不再塞回来（换造型时把版本号 +1） */
const SEED_KEY = 'lego-3d:sample-seeded-v3'

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

  /** 零件盒：点一个格子 → 把这个造型放进托盘（目录取用，不消耗） */
  takeFromCell: (cellId: string) => boolean
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
    const occ = buildOccupancy(puzzle.bricks)
    const spot = findDropPosition(occ, size)
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
      let puzzles = (snap?.puzzles ?? []).map((p) => ({
        ...p,
        container: normalizeContainer(p.container),
        // 只修互相穿插的方块，手动抬起来的悬空件保持原样
        bricks: reseatBricks(p.bricks),
      }))
      let activeId = snap?.activeId ?? null

      // 第一次打开工作区时送一只示例小狗；删掉之后不会再塞回来
      try {
        if (!window.localStorage.getItem(SEED_KEY)) {
          // 旧版本示例直接换成新的，避免工作区里留两只小狗
          const dog = createDogPuzzle()
          puzzles = [dog, ...puzzles.filter((p) => p.id !== DOG_PUZZLE_ID)]
          activeId = dog.id
          window.localStorage.setItem(SEED_KEY, '1')
        }
      } catch {
        /* 存储不可用时跳过 */
      }

      if (puzzles.length === 0) {
        const puzzle = makePuzzle('我的第一件作品')
        puzzles = [puzzle]
        activeId = puzzle.id
      }

      const resolved =
        activeId && puzzles.some((p) => p.id === activeId) ? activeId : puzzles[0].id
      set({ puzzles, activeId: resolved, hydrated: true })
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
      const occ = buildOccupancy(puzzle.bricks)
      const nx = brick.x + dx
      const ny = brick.y + dy
      const nz = brick.z + dz

      // 任何方向都不能穿模
      if (!canPlace(occ.cells, size, nx, ny, nz, brick.id)) {
        reject(brick.id, 'move', [dx, dy, dz])
        return
      }
      // 水平移动要求落点能扣上凸点；但已经有支撑的方块被手动抬起后（悬空中），
      // 允许继续在空中平移，方便挪到别的垛子上再放下
      const grounded =
        brick.y === 0 || hasSupport(occ, size, brick.x, brick.y, brick.z, brick.id)
      if (dy === 0 && grounded && !hasSupport(occ, size, nx, ny, nz, brick.id)) {
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

      // 旋转后同样要检查穿模；原本就落稳的方块还要保证转完仍然扣得上
      // （悬在空中被手动抬起的方块只查穿模，和水平移动保持一致）
      const occ = buildOccupancy(puzzle.bricks)
      const grounded =
        brick.y === 0 || hasSupport(occ, oldSize, brick.x, brick.y, brick.z, brick.id)
      const ok =
        canPlace(occ.cells, newSize, anchor.x, brick.y, anchor.z, brick.id) &&
        (!grounded || hasSupport(occ, newSize, anchor.x, brick.y, anchor.z, brick.id))
      if (!ok) {
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

    takeFromCell: (cellId) => {
      const puzzle = editable()
      if (!puzzle) return false
      const cell = puzzle.container.cells.find((c) => c.id === cellId)
      if (!cell || !cell.shapeId || !cell.color) return false
      // 零件盒是"目录"：同一格可以无限取用，取完不消耗
      return placeBrick(cell.shapeId, cell.color) !== null
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
