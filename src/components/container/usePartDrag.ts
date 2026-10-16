import { useCallback, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { ContainerCell } from '../../types'

/** 拖拽判定阈值（px），小于它就当成普通点击 */
const THRESHOLD = 6

const cellAt = (x: number, y: number): string | null => {
  const el = document.elementFromPoint(x, y)
  const hit = el?.closest('[data-cell]')
  return hit instanceof HTMLElement ? (hit.dataset.cell ?? null) : null
}

/**
 * 容器格子的拖拽换位。
 * 用 pointer 事件而不是原生 HTML5 drag：后者在触屏上不生效，
 * 而且 setPointerCapture 能让指针移出格子后依然收到事件，手感更稳。
 */
export function usePartDrag(onSwap: (fromId: string, toId: string) => void) {
  const [sourceId, setSourceId] = useState<string | null>(null)
  const [targetId, setTargetId] = useState<string | null>(null)
  const gesture = useRef<{ id: string; x: number; y: number; active: boolean } | null>(null)
  const suppressClick = useRef(false)

  const begin = useCallback((cell: ContainerCell, e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== 0) return
    gesture.current = { id: cell.id, x: e.clientX, y: e.clientY, active: false }
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* 合成事件或指针已释放时忽略 */
    }
  }, [])

  const move = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    const g = gesture.current
    if (!g) return
    if (!g.active) {
      if (Math.hypot(e.clientX - g.x, e.clientY - g.y) < THRESHOLD) return
      g.active = true
      setSourceId(g.id)
    }
    const over = cellAt(e.clientX, e.clientY)
    setTargetId(over && over !== g.id ? over : null)
  }, [])

  const finish = useCallback(
    (e: ReactPointerEvent<HTMLElement>, commit: boolean) => {
      const g = gesture.current
      gesture.current = null
      try {
        if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId)
        }
      } catch {
        /* 忽略 */
      }
      setSourceId(null)
      setTargetId(null)
      if (!g?.active) return
      // 拖动结束后浏览器还会补一个 click，这里吞掉，避免误取件
      suppressClick.current = true
      if (!commit) return
      const over = cellAt(e.clientX, e.clientY)
      if (over && over !== g.id) onSwap(g.id, over)
    },
    [onSwap],
  )

  const end = useCallback((e: ReactPointerEvent<HTMLElement>) => finish(e, true), [finish])
  const cancel = useCallback((e: ReactPointerEvent<HTMLElement>) => finish(e, false), [finish])

  /** 刚拖动过就吃掉这次点击，返回 true 表示应当忽略 */
  const consumeClick = useCallback(() => {
    if (!suppressClick.current) return false
    suppressClick.current = false
    return true
  }, [])

  return { sourceId, targetId, begin, move, end, cancel, consumeClick }
}
