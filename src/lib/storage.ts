import type { Puzzle } from '../types'

const KEY = 'lego-3d:workspace:v1'

export interface Snapshot {
  puzzles: Puzzle[]
  activeId: string | null
}

export function loadSnapshot(): Snapshot | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Snapshot
    if (!data || !Array.isArray(data.puzzles)) return null
    return { puzzles: data.puzzles, activeId: data.activeId ?? null }
  } catch {
    return null
  }
}

export function saveSnapshot(snapshot: Snapshot): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(snapshot))
  } catch {
    /* 存储不可用时静默降级 */
  }
}
