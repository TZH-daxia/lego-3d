import { Canvas } from '@react-three/fiber'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useActivePuzzle, usePuzzleStore } from '../store/usePuzzleStore'
import { ContainerGrid } from './container/ContainerGrid'
import { ControlPad } from './ControlPad'
import { CAMERA_FOV, DEFAULT_CAMERA_POSITION } from '../lib/camera'
import { Scene } from './scene/Scene'
import { Toolbar } from './Toolbar'
import { BrickTools } from './viewport/BrickTools'
import { Compass } from './viewport/Compass'

function useEditorKeyboard() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return

      const store = usePuzzleStore.getState()

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          store.moveSelected(-1, 0, 0)
          break
        case 'ArrowRight':
        case 'd':
        case 'D':
          store.moveSelected(1, 0, 0)
          break
        case 'ArrowUp':
        case 'w':
        case 'W':
          store.moveSelected(0, 0, -1)
          break
        case 'ArrowDown':
        case 's':
        case 'S':
          store.moveSelected(0, 0, 1)
          break
        case 'e':
        case 'E':
        case 'PageUp':
          store.moveSelected(0, 1, 0)
          break
        case 'q':
        case 'Q':
        case 'PageDown':
          store.moveSelected(0, -1, 0)
          break
        case 'Delete':
        case 'Backspace':
          store.deleteSelected()
          break
        case 'Escape':
          store.selectBrick(null)
          break
        default:
          return
      }
      e.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}

/** 点击空白处取消选中；拖动视角的行程不算"点击" */
function useViewportDeselect() {
  const down = useRef<[number, number] | null>(null)
  const selectBrick = usePuzzleStore((s) => s.selectBrick)

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      down.current = [e.clientX, e.clientY]
    }
    window.addEventListener('pointerdown', onDown, true)
    return () => window.removeEventListener('pointerdown', onDown, true)
  }, [])

  return (e: MouseEvent) => {
    const start = down.current
    down.current = null
    if (!start) return
    if (Math.hypot(e.clientX - start[0], e.clientY - start[1]) > 4) return
    selectBrick(null)
  }
}

/** ---------- 底部工作面高度：可上下拖拽，像 VS Code 的终端面板 ---------- */

const DOCK_KEY = 'lego-3d:dock-height'
/** 色板 + 内边距，恰好只露出色板时的高度 */
const DOCK_CHROME = 52
/** 零件格子的排高（和 CSS 的 --cell 保持一致） */
const DOCK_CELL = 56
/** 最多显示三排格子：52 + 3*56 + 行间距/边框 */
const DOCK_ROWS_MAX = 3
/** 默认高度：露出两排格子 */
const DOCK_DEFAULT = DOCK_CHROME + 2 * DOCK_CELL + 4
const VIEWPORT_MIN = 280

const dockMin = () => DOCK_CHROME
const dockMax = () =>
  Math.max(
    DOCK_CHROME + DOCK_CELL, // 窗口再矮也至少留一排
    Math.min(
      DOCK_CHROME + DOCK_ROWS_MAX * DOCK_CELL + 6,
      window.innerHeight - VIEWPORT_MIN,
    ),
  )

const clampDock = (h: number) => {
  const max = dockMax()
  return Math.min(Math.max(Math.round(h), dockMin()), max)
}

const readDockHeight = () => {
  const saved = Number(window.localStorage.getItem(DOCK_KEY))
  return saved > 0 ? clampDock(saved) : DOCK_DEFAULT
}

function useDockResize() {
  const [height, setHeight] = useState(readDockHeight)
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{ y: number; h: number } | null>(null)

  const save = useCallback((h: number) => {
    try {
      window.localStorage.setItem(DOCK_KEY, String(h))
    } catch {
      /* 存不了就算了 */
    }
  }, [])

  // 窗口变矮时把高度收回允许范围
  useEffect(() => {
    const onResize = () => setHeight((h) => clampDock(h))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.preventDefault()
    drag.current = { y: e.clientY, h: height }
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    // 往上拖 => 变高；3D 相机会按画布高度等比推拉，画面里的模型大小不变
    setHeight(clampDock(d.h + (d.y - e.clientY)))
  }

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    drag.current = null
    setDragging(false)
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    save(height)
  }

  const onDoubleClick = () => {
    const next = clampDock(DOCK_DEFAULT)
    setHeight(next)
    save(next)
  }

  return {
    height,
    dragging,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onDoubleClick,
    },
  }
}

export function Editor() {
  useEditorKeyboard()
  const onPointerMissed = useViewportDeselect()
  const puzzle = useActivePuzzle()
  const dock = useDockResize()

  if (!puzzle) {
    return (
      <main className="editor">
        <div className="editor__empty">
          <h2>还没有打开任何拼图</h2>
          <p>在左侧点击「新增拼图」开始搭建你的乐高作品</p>
        </div>
      </main>
    )
  }

  return (
    <main className="editor">
      <div className="viewport">
        <Canvas
          shadows
          dpr={[1, 2]}
          gl={{ antialias: true }}
          onPointerMissed={onPointerMissed}
          camera={{
            position: DEFAULT_CAMERA_POSITION,
            fov: CAMERA_FOV,
            near: 0.5,
            far: 260,
          }}
        >
          <Scene />
        </Canvas>
        <div className="viewport__vignette" aria-hidden />
        <BrickTools />
        <div className="viewport__top">
          <Toolbar />
          <Compass />
        </div>
        <div className="viewport__title">
          <h2>{puzzle.name}</h2>
          <span>乐高托盘 · {puzzle.bricks.length} 块积木</span>
        </div>
        <div className="viewport__hint">
          左键拖拽旋转视角 · 滚轮缩放 · 右键拖拽平移 · 点空白处取消选中
        </div>
      </div>

      <section className="dock" style={{ height: dock.height }}>
        <div
          className={`dock__resizer${dock.dragging ? ' is-dragging' : ''}`}
          role="separator"
          aria-orientation="horizontal"
          aria-label="拖拽调整零件盒高度"
          title="上下拖动调整零件盒高度 · 双击恢复默认"
          {...dock.handlers}
        />
        <div className="dock__main">
          <ContainerGrid />
        </div>
        <div className="dock__side">
          <ControlPad />
        </div>
      </section>
    </main>
  )
}
