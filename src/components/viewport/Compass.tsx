import { useEffect, useRef } from 'react'
import { registerCompassRotor, resetViewToDefault } from '../../lib/camera'

const DIRECTIONS = [
  { key: 'front', label: '前', key2: 'W' },
  { key: 'back', label: '后', key2: 'S' },
  { key: 'left', label: '左', key2: 'A' },
  { key: 'right', label: '右', key2: 'D' },
] as const

/**
 * 场景左侧的方向罗盘：跟着相机方位一起转，
 * 告诉你托盘的前 / 后 / 左 / 右分别在哪边，和 W / A / S / D 一一对应。
 */
export function Compass() {
  const rotor = useRef<HTMLDivElement>(null)

  useEffect(() => {
    registerCompassRotor(rotor.current)
    return () => registerCompassRotor(null)
  }, [])

  return (
    <div className="compass" aria-label="方向指示">
      <div className="compass__dial">
        <div className="compass__rotor" ref={rotor}>
          <span className="compass__ring" />
          <span className="compass__arrow" />
          <span className="compass__hub" />
          {DIRECTIONS.map((d) => (
            <span key={d.key} className={`compass__dir compass__dir--${d.key}`}>
              <b>{d.label}</b>
              <i>{d.key2}</i>
            </span>
          ))}
        </div>
      </div>
      <button
        type="button"
        className="compass__reset"
        title="回到正前方视角"
        onClick={resetViewToDefault}
      >
        重置视角
      </button>
    </div>
  )
}
