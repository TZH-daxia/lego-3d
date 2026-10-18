import { createStarterContainer } from './container'
import type { Brick, Puzzle } from '../types'

/** 示例拼图的固定 id：用它判断"已经给过这只小狗了" */
export const DOG_PUZZLE_ID = 'pz_sample_dog'

const BODY = '#FE8A18' // 亮橙：小狗主体
const EAR = '#6C6E68' // 深灰：耳朵
const EYE = '#05131D' // 碳黑：眼睛
const PAW = '#F4F4F4' // 砂白：嘴巴和爪子

const brick = (
  id: string,
  shapeId: string,
  color: string,
  x: number,
  y: number,
  z: number,
  ry = 0,
): Brick => ({ id, shapeId, color, x, y, z, rx: 0, ry })

/**
 * 示例拼图：一只趴着的小狗（体长 8 格 × 宽 4 格，头朝 +x）。
 *
 * 高度分层（1 层 = 1 个板高）：
 *   0~2  身子：3 层 4×8 薄板 = 1 个砖高
 *   3~5  头  ：4×4 砖，压在身子前端；嘴巴从正面探出一格
 *   3~5  尾巴：1×2 砖，贴在身子后端的顶上
 *   6~8  耳朵：两个 1×1 圆柱；尾巴尖再叠一个 1×1
 *   6    眼睛：两个 1×1 圆薄板
 *   0    四只爪子：身子两侧地面的 1×1 圆薄板
 */
export function createDogPuzzle(): Puzzle {
  const now = Date.now()
  return {
    id: DOG_PUZZLE_ID,
    name: '小狗',
    bricks: [
      // 身子：3 层 4×8 薄板（旋转 90° 变成 8 长 × 4 宽）
      brick('dog-body-1', 'p4x8', BODY, -4, 0, -2, 1),
      brick('dog-body-2', 'p4x8', BODY, -4, 1, -2, 1),
      brick('dog-body-3', 'p4x8', BODY, -4, 2, -2, 1),
      // 头：压在身子前端
      brick('dog-head', 'b4x4', BODY, 0, 3, -2),
      // 嘴：一块 2×2 斜面，坡面朝 +x，做成尖尖的嘴
      brick('dog-muzzle', 's2x2', BODY, 4, 3, -1, 1),
      // 耳朵：头顶后侧两个圆柱
      brick('dog-ear-l', 'r1x1', EAR, 0, 6, -2),
      brick('dog-ear-r', 'r1x1', EAR, 0, 6, 1),
      // 眼睛：头顶前沿两侧各一片黑色小片
      brick('dog-eye-l', 't1x1', EYE, 3, 6, -2),
      brick('dog-eye-r', 't1x1', EYE, 3, 6, 1),
      // 项圈：脖子处一圈红色薄板
      brick('dog-collar', 'p1x4', '#C91A09', -1, 3, -2),
      // 尾巴：身子后端顶上起一节，再叠一个往上翘
      brick('dog-tail-1', 'b1x2', BODY, -4, 3, -1, 1),
      brick('dog-tail-2', 'b1x1', BODY, -4, 6, -1),
      // 四只爪子：贴在身子两侧的地面上
      brick('dog-paw-fl', 'rp1x1', PAW, 2, 0, -3),
      brick('dog-paw-fr', 'rp1x1', PAW, 2, 0, 2),
      brick('dog-paw-bl', 'rp1x1', PAW, -3, 0, -3),
      brick('dog-paw-br', 'rp1x1', PAW, -3, 0, 2),
    ],
    container: createStarterContainer(),
    mode: 'edit',
    createdAt: now,
    updatedAt: now,
  }
}
