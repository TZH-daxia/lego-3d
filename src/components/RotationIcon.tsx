import type { RotationAction } from '../data/rotations'

/** 旋转动作图标：操作台与积木浮动按钮共用 */
export function RotationIcon({ action, size = 14 }: { action: RotationAction; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <rect
        x={action.rect[0]}
        y={action.rect[1]}
        width={action.rect[2]}
        height={action.rect[3]}
        rx={action.rect[4]}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      {action.paths.map((d) => (
        <path
          key={d}
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  )
}
