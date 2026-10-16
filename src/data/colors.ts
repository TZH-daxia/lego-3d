export interface LegoColor {
  name: string
  hex: string
}

/** 经典乐高配色，作为"添加前先选色"的色板 */
export const COLORS: LegoColor[] = [
  { name: '经典红', hex: '#C91A09' },
  { name: '亮橙', hex: '#FE8A18' },
  { name: '柠檬黄', hex: '#F2CD37' },
  { name: '草绿', hex: '#237841' },
  { name: '青蓝', hex: '#0055BF' },
  { name: '紫外光', hex: '#7B3FA0' },
  { name: '湖蓝', hex: '#00A3A3' },
  { name: '粉红', hex: '#E4ADC8' },
  { name: '砂白', hex: '#F4F4F4' },
  { name: '浅灰', hex: '#9BA19D' },
  { name: '深灰', hex: '#6C6E68' },
  { name: '碳黑', hex: '#05131D' },
]

export const DEFAULT_COLOR = COLORS[4].hex

export function colorName(hex: string): string {
  return COLORS.find((c) => c.hex.toLowerCase() === hex.toLowerCase())?.name ?? hex
}
