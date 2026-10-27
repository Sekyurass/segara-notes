import { useEffect, useRef, useState } from 'react'
import { clampIndent, createBlock } from '../lib/blocks'
import { numberedLabel, reorderBlocks } from '../lib/pages'
import { COVER_PRESETS, PAGE_ICONS, coverCss } from '../lib/storage'
import type { Block, BlockType, Page } from '../types'
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
    updateBlock(id, {
      type,
      checked: type === 'todo' ? false : undefined,
      collapsed: type === 'toggle' ? false : undefined,
      calloutTone: type === 'callout' ? 'info' : undefined,
      imageUrl: type === 'image' ? '' : undefined,
    })
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
    <div className="editor">
      {cover && (
        <div className="page-cover" style={{ background: cover }}>
          <button type="button" className="cover-change" onClick={() => setCoverOpen((v) => !v)}>
            Ganti cover
          </button>
          <button
            type="button"
            className="cover-remove"
            onClick={() => onChangePage({ cover: null })}
          >
            Hapus
          </button>
        </div>
      )}

      {coverOpen && (
        <div className="cover-picker">
          {COVER_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="cover-swatch"
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
        <nav className="breadcrumb" aria-label="Breadcrumb halaman">
          {breadcrumb.map((crumb, index) => {
            const isLast = index === breadcrumb.length - 1
            return (
              <span key={crumb.id} className="breadcrumb-item">
                {index > 0 && <span className="breadcrumb-sep">/</span>}
                {isLast ? (
                  <span className="breadcrumb-current">
                    {crumb.icon} {crumb.title || 'Tanpa judul'}
                  </span>
                ) : (
                  <button type="button" onClick={() => onSelectPage(crumb.id)}>
                    {crumb.icon} {crumb.title || 'Tanpa judul'}
                  </button>
                )}
              </span>
            )
          })}
        </nav>
      )}

      <div className="page-hero-actions">
        <button type="button" className="page-icon-btn" onClick={() => setIconOpen((v) => !v)}>
          {page.icon}
        </button>
        {!page.cover && (
          <button type="button" className="ghost-link" onClick={() => setCoverOpen(true)}>
            + Cover
          </button>
        )}
        <button
          type="button"
          className="ghost-link"
          onClick={() => onChangePage({ favorite: !page.favorite })}
        >
          {page.favorite ? '★ Favorit' : '☆ Favorit'}
        </button>
        <button type="button" className="ghost-link" onClick={() => onCreateChild(page.id)}>
          + Sub-halaman
        </button>
        <button type="button" className="ghost-link" onClick={onDuplicatePage}>
          Duplikat halaman
        </button>
      </div>

      {iconOpen && (
        <div className="icon-picker">
          {PAGE_ICONS.map((icon) => (
            <button
              key={icon}
              type="button"
              onClick={() => {
                onChangePage({ icon })
                setIconOpen(false)
              }}
            >
              {icon}
            </button>
          ))}
        </div>
      )}

      <textarea
        ref={titleRef}
        className="page-title"
        rows={1}
        value={page.title}
        placeholder="Tanpa judul"
        aria-label="Judul halaman"
        onChange={(e) => onChangePage({ title: e.target.value })}
      />

      {isEmpty && (
        <div className="empty-hint">
          Ketik <kbd>/</kbd> untuk blok · <kbd>@</kbd> sebut halaman · <kbd>Ctrl+K</kbd> cari
        </div>
      )}

      <div className="blocks">
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
