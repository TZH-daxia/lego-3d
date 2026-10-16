/**
 * 选中积木旁的浮动按钮 <-> 画布内的定位器 之间的桥。
 *
 * 不用 drei 的 <Html>：它会往画布旁边塞一个 portal 容器，版本/环境一变就容易静默不渲染。
 * 这里只交换"世界坐标锚点"和"DOM 节点"，由画布内的 AnchorTracker 每帧投影成屏幕坐标。
 */
let anchor: [number, number, number] | null = null
let element: HTMLElement | null = null

export const setToolsAnchor = (next: [number, number, number] | null) => {
  anchor = next
}

export const getToolsAnchor = () => anchor

export const registerToolsElement = (el: HTMLElement | null) => {
  element = el
}

export const getToolsElement = () => element
