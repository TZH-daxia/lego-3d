import { COLORS } from '../data/colors'
import { useEditMode, usePuzzleStore, useSelectedBrickId } from '../store/usePuzzleStore'

/** 色板：选中方块后点色块直接改色（新零件的颜色在零件弹窗里选） */
export function ColorPalette() {
  const current = usePuzzleStore((s) => s.currentColor)
  const setCurrentColor = usePuzzleStore((s) => s.setCurrentColor)
  const editable = useEditMode()
  const selectedId = useSelectedBrickId()
  const disabled = !editable || !selectedId

  return (
    <div
      className="colors"
      title={selectedId ? '点色块，直接换掉选中方块的颜色' : '先选中一个方块，再点色块改色'}
    >
      <div className="colors__row">
        {COLORS.map((c) => (
          <button
            key={c.hex}
            type="button"
            className={`swatch${current.toLowerCase() === c.hex.toLowerCase() ? ' is-on' : ''}`}
            style={{ background: c.hex }}
            title={c.name}
            disabled={disabled}
            onClick={() => setCurrentColor(c.hex)}
          />
        ))}
      </div>
    </div>
  )
}
