/**
 * 阴影预算。
 *
 * three 默认每帧都重画 directional light 的 shadow map（2048² 的一次完整场景绘制），
 * 场景里没有东西在动的时候这完全是白做的，还会和 DOM 交互抢主线程 / GPU，
 * 表现就是"悬浮格子、打开弹窗时发卡"。
 *
 * 现在改成按需更新：只有方块在动画中（位移 / 旋转 / 出生 / 碰撞抖动）才置脏。
 */
let dirty = true

export const markShadowDirty = () => {
  dirty = true
}

/** 取出脏标记并清零：返回 true 表示这一帧需要重算阴影 */
export const consumeShadowDirty = () => {
  const wasDirty = dirty
  dirty = false
  return wasDirty
}
