import { BLOCK_GLYPH, SLASH_GROUP_LABEL } from '../lib/blocks'
import type { BlockType, SlashGroup, SlashItem } from '../types'

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

  const groups = (['basic', 'list', 'media'] as SlashGroup[])
    .map((group) => ({
      group,
      entries: items
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.group === group),
    }))
    .filter((g) => g.entries.length > 0)

  return (
    <div className="slash-menu" role="listbox" aria-label="Menu blok">
      {groups.map(({ group, entries }) => (
        <div key={group} className="slash-group">
          <div className="slash-label">{SLASH_GROUP_LABEL[group]}</div>
          {entries.map(({ item, index }) => (
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
              <span className="slash-glyph">{BLOCK_GLYPH[item.type]}</span>
              <span className="slash-meta">
                <strong>{item.label}</strong>
                <span>{item.hint}</span>
              </span>
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
