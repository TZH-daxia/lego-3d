import { Canvas } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
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
        case 'r':
        case 'R':
          store.rotateSelected('y', e.shiftKey ? -1 : 1)
          break
        case 't':
        case 'T':
          store.rotateSelected('x', e.shiftKey ? -1 : 1)
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

export function Editor() {
  useEditorKeyboard()
  const onPointerMissed = useViewportDeselect()
  const puzzle = useActivePuzzle()

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
          <Compass />
          <Toolbar />
        </div>
        <div className="viewport__title">
          <h2>{puzzle.name}</h2>
          <span>乐高托盘 · {puzzle.bricks.length} 块积木</span>
        </div>
        <div className="viewport__hint">
          左键拖拽旋转视角 · 滚轮缩放 · 右键拖拽平移 · 点空白处取消选中
        </div>
      </div>

      <section className="dock">
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
