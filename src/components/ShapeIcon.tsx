import { useId, useMemo } from 'react'
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
/** 凸点半径（世界单位，与 3D 一致） */
const STUD_R = 0.3

type P3 = [number, number, number]

const px = (u: number, v: number) => K * (u - v)
const py = (u: number, v: number, t: number) => H * (u + v) - t

const round3 = (n: number) => Math.round(n * 1000) / 1000
const pt = (x: number, y: number) => `${round3(x)},${round3(y)}`
const toPoints = (pts: P3[]) => pts.map(([u, v, t]) => pt(px(u, v), py(u, v, t))).join(' ')

function clamp(v: number, lo: number, hi: number) {
  return Math.min(Math.max(v, lo), hi)
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
    /* ---------- 圆柱：顶面椭圆 + 侧壁（两段椭圆弧 + 两条竖直切线） ---------- */
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

    const ARC = (Math.PI * 2) / 18
    const arc = (cy: number, from: number, to: number) => {
      const out: string[] = []
      const steps = Math.max(4, Math.round(Math.abs(to - from) / ARC))
      for (let i = 0; i <= steps; i++) {
        const [x, y] = at(from + ((to - from) * i) / steps, cy)
        probe.push([x, y])
        out.push(pt(x, y))
      }
      return out
    }

    const TOP = Math.PI * 1.25
    const BOTTOM = Math.PI * 0.25
    const outline = [...arc(cyTop, TOP, TOP + Math.PI), ...arc(cyBot, BOTTOM, BOTTOM + Math.PI)]
    body = `M${outline[0]} L${outline.slice(1).join(' L')} Z`

    const cap: string[] = []
    for (let i = 0; i < 30; i++) {
      const [x, y] = at((i / 30) * Math.PI * 2, cyTop)
      cap.push(pt(x, y))
    }
    faces.push({ key: 'cap', points: cap.join(' '), fill: shade(color, 8) })
    addStud('r0', cu, cv, h)
  } else if (shape.kind === 'slope') {
    /* ---------- 斜面：平顶在后段，45° 坡朝 +z（和 3D 几何体一致） ---------- */
    const run = Math.min(h, d)
    const flat = Math.min(d, run)
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
        if (j + 0.5 + STUD_R > flat) continue
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
  const edge = shade(color, -64)

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
          fill={shade(color, 30)}
        />
      ))}
    </svg>
  )
}
