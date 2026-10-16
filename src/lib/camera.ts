/**
 * 默认视角：正对底板正前方。
 * 相机不偏方位角，屏幕的上下左右就是托盘的前后左右，
 * 所以 W/S/A/D 在画面上是"笔直"的，配合左侧罗盘不会再转向。
 */
export const DEFAULT_CAMERA_POSITION: [number, number, number] = [0, 24, 41]
export const DEFAULT_CAMERA_TARGET: [number, number, number] = [0, 1.2, 0]
/** 略收一点的视角（长焦感），让整块底板完整进画的同时方块不至于太小 */
export const CAMERA_FOV = 30

/**
 * 画布内外通信桥。
 * 罗盘方位角每帧都在变，走 React state 会引发整棵树重渲染，
 * 所以这里只交换一个 DOM 节点引用和一个重置视角的函数。
 */
let rotor: HTMLElement | null = null
let resetView: (() => void) | null = null

export const registerCompassRotor = (el: HTMLElement | null) => {
  rotor = el
}

export const getCompassRotor = () => rotor

export const registerViewReset = (fn: (() => void) | null) => {
  resetView = fn
}

export const resetViewToDefault = () => {
  resetView?.()
}

/**
 * 视角拖拽闸门。
 *
 * 在方块上按下指针时要把 OrbitControls 临时关掉：
 * 否则"按住零件"会同时被当成旋转视角，方块跟着视线一起跑。
 * 按下期间禁用，抬起（或 pointercancel）立刻恢复。
 */
let orbitControls: { enabled: boolean } | null = null
let orbitSuspended = false

const releaseOrbit = () => {
  if (!orbitSuspended || !orbitControls) return
  orbitSuspended = false
  orbitControls.enabled = true
}

export const registerOrbitControls = (controls: { enabled: boolean } | null) => {
  orbitControls = controls
  if (!controls) orbitSuspended = false
}

export const suspendOrbitForPointer = () => {
  if (!orbitControls || orbitSuspended) return
  orbitSuspended = true
  orbitControls.enabled = false
  window.addEventListener('pointerup', releaseOrbit, { once: true })
  window.addEventListener('pointercancel', releaseOrbit, { once: true })
}
