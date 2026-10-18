/**
 * 选中积木旁的浮动按钮 <-> 画布内的定位器 之间的桥。
 *
 * 不用 drei 的 <Html>：它会往画布旁边塞一个 portal 容器，版本/环境一变就容易静默不渲染。
 * 这里只交换"选中积木包围盒的 8 个世界坐标角点"和"DOM 节点"，
 * 由画布内的 AnchorTracker 每帧投影成屏幕包围盒——用包围盒而不是单个锚点，
 * 无论视角转到哪一侧，按钮都稳定地贴在积木屏幕投影的右边。
 */
export type ToolsCorners = [number, number, number][]

let corners: ToolsCorners | null = null
let element: HTMLElement | null = null

export const setToolsAnchor = (next: ToolsCorners | null) => {
  corners = next
}

export const getToolsAnchor = () => corners

export const registerToolsElement = (el: HTMLElement | null) => {
  element = el
}

export const getToolsElement = () => element
