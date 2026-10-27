import type { BlockType, SlashItem } from '../types'

const GLYPH: Record<BlockType, string> = {
  paragraph: 'T',
  heading1: 'H1',
  heading2: 'H2',
  bullet: '•',
  todo: '☑',
  code: '</>',
}

type Props = {
  items: SlashItem[]
  activeIndex: number
  onSelect: (type: BlockType) => void
  onHover: (index: number) => void
}

export function SlashMenu({ items, activeIndex, onSelect, onHover }: Props) {
  if (items.length === 0) {
    return (
      <div className="slash-menu" role="listbox" aria-label="Menu blok">
        <div className="slash-empty">Tidak ada jenis blok</div>
      </div>
    )
  }

  return (
    <div className="slash-menu" role="listbox" aria-label="Menu blok">
      <div className="slash-label">Blok dasar</div>
      {items.map((item, index) => (
        <button
          key={item.type}
          type="button"
          role="option"
          aria-selected={index === activeIndex}
          className={`slash-item${index === activeIndex ? ' active' : ''}`}
          onMouseEnter={() => onHover(index)}
          onMouseDown={(e) => {
            e.preventDefault()
            onSelect(item.type)
          }}
        >
          <span className="slash-glyph">{GLYPH[item.type]}</span>
          <span className="slash-meta">
            <strong>{item.label}</strong>
            <span>{item.hint}</span>
          </span>
        </button>
      ))}
    </div>
  )
}
