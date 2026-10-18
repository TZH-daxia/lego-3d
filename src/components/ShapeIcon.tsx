import { useId, useMemo } from 'react'
import { STUD_R, slopeFlat } from '../lib/grid'
import type { ShapeDef } from '../types'

/**
 * 等轴测（斜视）图标：顶面 + 右侧面 + 前侧面 + 顶面凸点。
 * 投影公式：屏幕 x = cos30°·(u - v)，屏幕 y = sin30°·(u + v) - t
 * 这里 (u,v,t) 直接就是世界坐标，各面比例与 3D 里的几何体保持一致。
 */
const K = Math.cos(Math.PI / 6)
const H = Math.sin(Math.PI / 6)
/** 一个板高的世界高度 */
const PLATE_H = 0.42


type P3 = [number, number, number]

const px = (u: number, v: number) => K * (u - v)
const py = (u: number, v: number, t: number) => H * (u + v) - t

const round3 = (n: number) => Math.round(n * 1000) / 1000
const pt = (x: number, y: number) => `${round3(x)},${round3(y)}`
const toPoints = (pts: P3[]) => pts.map(([u, v, t]) => pt(px(u, v), py(u, v, t))).join(' ')

function clamp(v: number, lo: number, hi: number) {
  return Math.min(Math.max(v, lo), hi)
}

/** 相对亮度：用来给深色件换成浅色描边，否则黑件糊成一团 */
function luminance(hex: string): number {
  const clean = hex.replace('#', '')
  const num = parseInt(clean.length === 3 ? clean.replace(/(.)/g, '$1$1') : clean, 16)
  return 0.299 * ((num >> 16) & 255) + 0.587 * ((num >> 8) & 255) + 0.114 * (num & 255)
}

/** 描边色：浅色件压暗，深色件提亮，保证任何颜色下结构线都看得清 */
function edgeTone(hex: string): string {
  return luminance(hex) < 86 ? 'rgba(255, 255, 255, 0.52)' : shade(hex, -74)
}

/** 同一色相做明暗，模拟等轴测下各面的受光差异 */
function shade(hex: string, amount: number): string {
  const clean = hex.replace('#', '')
  const num = parseInt(clean.length === 3 ? clean.replace(/(.)/g, '$1$1') : clean, 16)
  const r = clamp(((num >> 16) & 255) + amount, 0, 255)
  const g = clamp(((num >> 8) & 255) + amount, 0, 255)
  const b = clamp((num & 255) + amount, 0, 255)
  return `rgb(${r},${g},${b})`
}

interface Face {
  key: string
  points: string
  fill: string
}

interface Stud {
  key: string
  x: number
  y: number
}

interface IconModel {
  viewBox: string
  /** 圆柱件：侧壁轮廓（先画，用渐变表现柱面） */
  body: string | null
  faces: Face[]
  studs: Stud[]
}

function buildIcon(shape: ShapeDef, color: string): IconModel {
  const w = shape.w
  const d = shape.d
  const h = shape.h * PLATE_H
  const faces: Face[] = []
  const studs: Stud[] = []
  const probe: number[][] = []
  let body: string | null = null

  const topFill = shade(color, 0)
  const rightFill = shade(color, -22)
  const frontFill = shade(color, -40)
  const rampFill = shade(color, -26)

  const addStud = (key: string, u: number, v: number, t: number) => {
    const x = px(u, v)
    const y = py(u, v, t)
    studs.push({ key, x, y })
    probe.push(
      [x - K * STUD_R * 1.6, y - H * STUD_R * 1.6],
      [x + K * STUD_R * 1.6, y + H * STUD_R * 1.6],
    )
  }

  if (shape.kind === 'round') {
    /* ---------- 圆柱：顶面椭圆 + 可见侧壁（前沿两段弧 + 两条竖直母线） ---------- */
    const r = Math.min(w, d) / 2
    const cu = w / 2
    const cv = d / 2
    const cx = px(cu, cv)
    const cyTop = py(cu, cv, h)
    const cyBot = cyTop + h
    const at = (theta: number, cy: number): [number, number] => [
      cx + K * r * (Math.cos(theta) - Math.sin(theta)),
      cy + H * r * (Math.cos(theta) + Math.sin(theta)),
    ]

    const ARC = (Math.PI * 2) / 24
    const arc = (cy: number, from: number, to: number) => {
      const out: [number, number][] = []
      const steps = Math.max(4, Math.round(Math.abs(to - from) / ARC))
      for (let i = 0; i <= steps; i++) {
        const p = at(from + ((to - from) * i) / steps, cy)
        probe.push(p)
        out.push(p)
      }
      return out
    }

    // 屏幕上的左右极值母线：135°（左）与 -45°（右）；前沿经过 45°（正下方）
    const LEFT = (Math.PI * 3) / 4
    const RIGHT = -Math.PI / 4

    const wall = [...arc(cyTop, LEFT, RIGHT), ...arc(cyBot, RIGHT, LEFT)]
    body = `M${wall.map(([x, y]) => pt(x, y)).join(' L')} Z`

    const cap: string[] = []
    for (let i = 0; i < 36; i++) {
      const [x, y] = at((i / 36) * Math.PI * 2, cyTop)
      cap.push(pt(x, y))
    }
    faces.push({ key: 'cap', points: cap.join(' '), fill: shade(color, 10) })
    addStud('r0', cu, cv, h)
  } else if (shape.kind === 'slope') {
    /* ---------- 斜面：平顶在后段，45° 坡朝 +z（和 3D 几何体一致） ---------- */
    const flat = slopeFlat(h, d)
    faces.push({
      key: 'top',
      points: toPoints([
        [0, 0, h],
        [w, 0, h],
        [w, flat, h],
        [0, flat, h],
      ]),
      fill: topFill,
    })
    faces.push({
      key: 'ramp',
      points: toPoints([
        [0, flat, h],
        [w, flat, h],
        [w, d, 0],
        [0, d, 0],
      ]),
      fill: rampFill,
    })
    faces.push({
      key: 'right',
      points: toPoints([
        [w, 0, h],
        [w, flat, h],
        [w, d, 0],
        [w, 0, 0],
      ]),
      fill: rightFill,
    })
    probe.push(
      [px(0, 0), py(0, 0, h)],
      [px(w, 0), py(w, 0, h)],
      [px(w, d), py(w, d, 0)],
      [px(0, d), py(0, d, 0)],
    )
    for (let i = 0; i < w; i++) {
      for (let j = 0; j < d; j++) {
        // 只保留落在平顶里的凸点（和 3D 几何的判据一致）
        if (j + 0.5 < 0.02 || j + 0.5 > flat - 0.02) continue
        addStud(`s${i}-${j}`, i + 0.5, j + 0.5, h)
      }
    }
  } else {
    /* ---------- 砖 / 薄板 / 平滑片：三个可见面 ---------- */
    faces.push({
      key: 'top',
      points: toPoints([
        [0, 0, h],
        [w, 0, h],
        [w, d, h],
        [0, d, h],
      ]),
      fill: topFill,
    })
    faces.push({
      key: 'right',
      points: toPoints([
        [w, 0, h],
        [w, d, h],
        [w, d, 0],
        [w, 0, 0],
      ]),
      fill: rightFill,
    })
    faces.push({
      key: 'front',
      points: toPoints([
        [0, d, h],
        [w, d, h],
        [w, d, 0],
        [0, d, 0],
      ]),
      fill: frontFill,
    })
    probe.push(
      [px(0, 0), py(0, 0, h)],
      [px(w, 0), py(w, 0, h)],
      [px(w, d), py(w, d, 0)],
      [px(0, d), py(0, d, 0)],
    )
    if (shape.kind !== 'tile') {
      for (let i = 0; i < w; i++) {
        for (let j = 0; j < d; j++) addStud(`s${i}-${j}`, i + 0.5, j + 0.5, h)
      }
    }
  }

  const xs = probe.map((p) => p[0])
  const ys = probe.map((p) => p[1])
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const pad = Math.max(0.28, Math.max(maxX - minX, maxY - minY) * 0.055)

  return {
    viewBox: `${round3(minX - pad)} ${round3(minY - pad)} ${round3(
      maxX - minX + pad * 2,
    )} ${round3(maxY - minY + pad * 2)}`,
    body,
    faces,
    studs,
  }
}

interface Props {
  shape: ShapeDef
  color: string
}

export function ShapeIcon({ shape, color }: Props) {
  const model = useMemo(() => buildIcon(shape, color), [shape, color])
  const rawId = useId()
  const gradId = `cyl-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`
  const edge = edgeTone(color)

  return (
    <svg
      viewBox={model.viewBox}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      {model.body && (
        <defs>
          {/* 横向明暗渐变：让圆柱看起来是转着面的 */}
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={shade(color, -52)} />
            <stop offset="20%" stopColor={shade(color, -16)} />
            <stop offset="48%" stopColor={shade(color, 14)} />
            <stop offset="76%" stopColor={shade(color, -16)} />
            <stop offset="100%" stopColor={shade(color, -56)} />
          </linearGradient>
        </defs>
      )}
      {model.body && (
        <path d={model.body} fill={`url(#${gradId})`} stroke={edge} strokeWidth={0.022} />
      )}
      {model.faces.map((face) => (
        <polygon
          key={face.key}
          points={face.points}
          fill={face.fill}
          stroke={edge}
          strokeWidth={0.022}
          strokeLinejoin="round"
        />
      ))}
      {model.studs.map((stud) => (
        <ellipse
          key={stud.key}
          cx={0}
          cy={0}
          rx={STUD_R}
          ry={STUD_R}
          transform={`matrix(${K},${H},${-K},${H},${round3(stud.x)},${round3(stud.y)})`}
          /* 凸点用更亮的顶面 + 亮暗自适应的描边，缩到 40px 也能看出是一颗颗凸起 */
          fill={shade(color, 34)}
          stroke={edge}
          strokeWidth={0.05}
        />
      ))}
    </svg>
  )
}
