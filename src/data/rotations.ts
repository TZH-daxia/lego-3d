/**
 * 四个 90° 步进旋转动作。
 *
 * 只给选中积木旁浮出来的那列透明图标按钮使用（不绑键盘快捷键）：
 * 图标、轴向、方向都只有一处来源。
 */
export interface RotationAction {
  id: string
  label: string
  axis: 'x' | 'y'
  dir: 1 | -1
  /** 图标：一个居中示意的小积木 + 旋转指示 */
  rect: [x: number, y: number, w: number, h: number, rx: number]
  paths: string[]
}

export const ROTATIONS: RotationAction[] = [
  {
    /* 向上翻：绕 X 轴 -90°，积木顶面朝里翻过去 */
    id: 'tip-up',
    label: '向上翻转',
    axis: 'x',
    dir: -1,
    rect: [8, 13, 8, 6.5, 1.6],
    paths: ['M4 11.5a8 8 0 0 1 16 0', 'M17.4 9.8L20 11.5L17.2 13.4'],
  },
  {
    /* 向下翻：绕 X 轴 +90°，积木顶面朝自己翻过来 */
    id: 'tip-down',
    label: '向下翻转',
    axis: 'x',
    dir: 1,
    rect: [8, 4.5, 8, 6.5, 1.6],
    paths: ['M4 12.5a8 8 0 0 0 16 0', 'M17.2 10.6L20 12.5L17.4 14.2'],
  },
  {
    /* 向左转：绕 Y 轴 -90°，绕积木逆时针一圈 */
    id: 'turn-left',
    label: '向左旋转',
    axis: 'y',
    dir: -1,
    rect: [8.5, 8.5, 7, 7, 1.6],
    paths: ['M6.34 6.34A8 8 0 1 0 14.07 4.27', 'M8.85 5.67L6.34 6.34L7.01 3.83'],
  },
  {
    /* 向右转：绕 Y 轴 +90°，积木正面转向屏幕右侧 */
    id: 'turn-right',
    label: '向右旋转',
    axis: 'y',
    dir: 1,
    rect: [8.5, 8.5, 7, 7, 1.6],
    paths: ['M17.66 6.34A8 8 0 1 1 9.93 4.27', 'M15.15 5.67L17.66 6.34L16.99 3.83'],
  },
]
