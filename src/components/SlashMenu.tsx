import { BLOCK_GLYPH, SLASH_GROUP_LABEL } from '@/lib/blocks'
import type { BlockType, SlashGroup, SlashItem } from '@/types'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'

type Props = {
  items: SlashItem[]
  activeIndex: number
  onSelect: (type: BlockType) => void
  onHover: (index: number) => void
}

export function SlashMenu({ items, activeIndex, onSelect, onHover }: Props) {
  if (items.length === 0) {
    return (
      <Card className="absolute top-[calc(100%+4px)] left-8 z-20 w-[min(280px,calc(100vw-48px))] p-3 text-sm text-muted-foreground shadow-lg">
        Tidak ada jenis blok
      </Card>
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
    <Card
      className="absolute top-[calc(100%+4px)] left-8 z-20 max-h-80 w-[min(280px,calc(100vw-48px))] overflow-auto p-1.5 shadow-lg"
      role="listbox"
      aria-label="Menu blok"
    >
      {groups.map(({ group, entries }) => (
        <div key={group} className="mb-1 border-b border-border pb-1 last:mb-0 last:border-0 last:pb-0">
          <div className="px-2 py-1.5 text-[0.7rem] font-semibold tracking-wider text-muted-foreground uppercase">
            {SLASH_GROUP_LABEL[group]}
          </div>
          {entries.map(({ item, index }) => (
            <button
              key={item.type}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              className={cn(
                'grid w-full grid-cols-[2.25rem_1fr] items-center gap-2 rounded-md p-2 text-left hover:bg-accent',
                index === activeIndex && 'bg-accent',
              )}
              onMouseEnter={() => onHover(index)}
              onMouseDown={(e) => {
                e.preventDefault()
                onSelect(item.type)
              }}
            >
              <span className="grid size-9 place-items-center rounded-md border border-border bg-background text-xs font-semibold text-muted-foreground">
                {BLOCK_GLYPH[item.type]}
              </span>
              <span className="min-w-0">
                <strong className="block text-sm font-semibold">{item.label}</strong>
                <span className="text-xs text-muted-foreground">{item.hint}</span>
              </span>
            </button>
          ))}
        </div>
      ))}
    </Card>
  )
}
