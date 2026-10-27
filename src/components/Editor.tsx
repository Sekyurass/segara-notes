import { useEffect, useRef, useState } from 'react'
import { Copy, ImageIcon, Star } from 'lucide-react'
import { clampIndent, createBlock } from '@/lib/blocks'
import { createDefaultDatabase } from '@/lib/database'
import { numberedLabel, reorderBlocks } from '@/lib/pages'
import { COVER_PRESETS, PAGE_ICONS, coverCss } from '@/lib/storage'
import type { Block, BlockType, Page } from '@/types'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { Textarea } from '@/components/ui/textarea'
import { BlockRow } from './BlockRow'

type Props = {
  page: Page
  pages: Page[]
  breadcrumb: Page[]
  onChangePage: (partial: Partial<Page>) => void
  onChangeBlocks: (blocks: Block[]) => void
  onSelectPage: (id: string) => void
  onCreateChild: (parentId: string) => void
  onDuplicatePage: () => void
}

export function Editor({
  page,
  pages,
  breadcrumb,
  onChangePage,
  onChangeBlocks,
  onSelectPage,
  onCreateChild,
  onDuplicatePage,
}: Props) {
  const focusId = useRef<string | null>(null)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [iconOpen, setIconOpen] = useState(false)
  const [coverOpen, setCoverOpen] = useState(false)

  useEffect(() => {
    const el = titleRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [page.title])

  const isEmpty =
    page.blocks.length === 1 &&
    page.blocks[0]?.type === 'paragraph' &&
    !page.blocks[0].text

  function updateBlock(id: string, patch: Partial<Block>) {
    onChangeBlocks(page.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)))
  }

  function turnInto(id: string, type: BlockType) {
    const patch: Partial<Block> = {
      type,
      checked: type === 'todo' ? false : undefined,
      collapsed: type === 'toggle' ? false : undefined,
      calloutTone: type === 'callout' ? 'info' : undefined,
      imageUrl: type === 'image' ? '' : undefined,
      database: type === 'database' ? createDefaultDatabase() : undefined,
    }
    if (type === 'database') patch.text = 'Database'
    updateBlock(id, patch)
  }

  function insertAfter(id: string, type: BlockType = 'paragraph') {
    const current = page.blocks.find((b) => b.id === id)
    const next = createBlock(type)
    next.indent = clampIndent(current?.indent)
    if (current && (current.type === 'bullet' || current.type === 'numbered' || current.type === 'todo')) {
      next.type = current.type
      if (current.type === 'todo') next.checked = false
    }
    const index = page.blocks.findIndex((b) => b.id === id)
    const blocks = [...page.blocks]
    blocks.splice(index + 1, 0, next)
    focusId.current = next.id
    onChangeBlocks(blocks)
  }

  function removeBlock(id: string) {
    if (page.blocks.length === 1) {
      const alone = createBlock('paragraph')
      focusId.current = alone.id
      onChangeBlocks([alone])
      return
    }
    const index = page.blocks.findIndex((b) => b.id === id)
    const blocks = page.blocks.filter((b) => b.id !== id)
    focusId.current = blocks[Math.max(0, index - 1)]?.id ?? null
    onChangeBlocks(blocks)
  }

  function duplicateBlock(id: string) {
    const index = page.blocks.findIndex((b) => b.id === id)
    if (index < 0) return
    const copy = { ...page.blocks[index], id: createBlock().id }
    const blocks = [...page.blocks]
    blocks.splice(index + 1, 0, copy)
    focusId.current = copy.id
    onChangeBlocks(blocks)
  }

  function finishDrop(targetId: string) {
    if (!dragId) return
    onChangeBlocks(reorderBlocks(page.blocks, dragId, targetId))
    setDragId(null)
    setOverId(null)
  }

  const cover = coverCss(page.cover)

  return (
    <div className="editor animate-in fade-in-0 duration-200">
      {cover && (
        <div className="page-cover group" style={{ background: cover }}>
          <div className="absolute right-3 bottom-3 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
            <Button size="sm" variant="secondary" onClick={() => setCoverOpen((v) => !v)}>
              Ganti cover
            </Button>
            <Button size="sm" variant="secondary" onClick={() => onChangePage({ cover: null })}>
              Hapus
            </Button>
          </div>
        </div>
      )}

      {coverOpen && (
        <div className="mb-3 flex flex-wrap gap-2">
          {COVER_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="h-9 w-14 rounded-md border border-border outline-offset-2 hover:outline hover:outline-2 hover:outline-primary"
              style={{ background: preset.css }}
              title={preset.label}
              onClick={() => {
                onChangePage({ cover: preset.id })
                setCoverOpen(false)
              }}
            />
          ))}
        </div>
      )}

      {breadcrumb.length > 1 && (
        <nav className="mb-3 flex flex-wrap items-center gap-1 text-sm text-muted-foreground" aria-label="Breadcrumb">
          {breadcrumb.map((crumb, index) => {
            const isLast = index === breadcrumb.length - 1
            return (
              <span key={crumb.id} className="inline-flex items-center gap-1">
                {index > 0 && <span className="text-muted-foreground/60">/</span>}
                {isLast ? (
                  <span className="font-medium text-foreground">
                    {crumb.icon} {crumb.title || 'Tanpa judul'}
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-1.5"
                    onClick={() => onSelectPage(crumb.id)}
                  >
                    {crumb.icon} {crumb.title || 'Tanpa judul'}
                  </Button>
                )}
              </span>
            )
          })}
        </nav>
      )}

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          className="size-14 text-2xl"
          onClick={() => setIconOpen((v) => !v)}
        >
          {page.icon}
        </Button>
        {!page.cover && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setCoverOpen(true)}>
            <ImageIcon /> Cover
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChangePage({ favorite: !page.favorite })}
        >
          <Star className={page.favorite ? 'fill-current' : ''} />
          Favorit
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => onCreateChild(page.id)}>
          + Sub-halaman
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDuplicatePage}>
          <Copy /> Duplikat
        </Button>
      </div>

      {iconOpen && (
        <div className="mb-3 flex flex-wrap gap-1">
          {PAGE_ICONS.map((icon) => (
            <Button
              key={icon}
              type="button"
              variant="ghost"
              size="icon"
              className="text-lg"
              onClick={() => {
                onChangePage({ icon })
                setIconOpen(false)
              }}
            >
              {icon}
            </Button>
          ))}
        </div>
      )}

      <Textarea
        ref={titleRef}
        className="mb-4 min-h-0 resize-none border-0 bg-transparent p-0 text-[clamp(1.8rem,3vw,2.4rem)] font-bold tracking-tight shadow-none focus-visible:ring-0"
        rows={1}
        value={page.title}
        placeholder="Tanpa judul"
        aria-label="Judul halaman"
        onChange={(e) => onChangePage({ title: e.target.value })}
      />

      {isEmpty && (
        <p className="mb-4 text-sm text-muted-foreground">
          Ketik <Kbd>/</Kbd> untuk blok · <Kbd>@</Kbd> sebut halaman · <Kbd>Ctrl+K</Kbd> cari
        </p>
      )}

      <div className="flex flex-col gap-0.5">
        {page.blocks.map((block) => (
          <BlockRow
            key={block.id}
            block={block}
            pages={pages}
            numberLabel={numberedLabel(page.blocks, block.id)}
            autoFocus={focusId.current === block.id}
            isDragging={dragId === block.id}
            isDragOver={overId === block.id && dragId !== block.id}
            onChange={(patch) => updateBlock(block.id, patch)}
            onEnter={() => insertAfter(block.id)}
            onBackspaceEmpty={() => removeBlock(block.id)}
            onIndent={(delta) =>
              updateBlock(block.id, { indent: clampIndent((block.indent ?? 0) + delta) })
            }
            onDuplicate={() => duplicateBlock(block.id)}
            onDelete={() => removeBlock(block.id)}
            onTurnInto={(type) => turnInto(block.id, type)}
            onMentionPage={() => undefined}
            onDragStart={(id) => {
              setDragId(id)
              setOverId(id)
            }}
            onDragOver={(id) => setOverId(id)}
            onDrop={finishDrop}
            onDragEnd={() => {
              setDragId(null)
              setOverId(null)
            }}
          />
        ))}
      </div>
    </div>
  )
}
