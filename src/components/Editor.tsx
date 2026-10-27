import { useEffect, useRef, useState } from 'react'
import { createBlock } from '../lib/blocks'
import { reorderBlocks } from '../lib/pages'
import type { Block, BlockType, Page } from '../types'
import { BlockRow } from './BlockRow'

type Props = {
  page: Page
  breadcrumb: Page[]
  onChangeTitle: (title: string) => void
  onChangeBlocks: (blocks: Block[]) => void
  onSelectPage: (id: string) => void
}

export function Editor({
  page,
  breadcrumb,
  onChangeTitle,
  onChangeBlocks,
  onSelectPage,
}: Props) {
  const focusId = useRef<string | null>(null)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  useEffect(() => {
    const el = titleRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [page.title])

  function updateBlock(id: string, patch: Partial<Block>) {
    onChangeBlocks(page.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)))
  }

  function insertAfter(id: string, type: BlockType = 'paragraph') {
    const next = createBlock(type)
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

  function finishDrop(targetId: string) {
    if (!dragId) return
    onChangeBlocks(reorderBlocks(page.blocks, dragId, targetId))
    setDragId(null)
    setOverId(null)
  }

  return (
    <div className="editor">
      {breadcrumb.length > 1 && (
        <nav className="breadcrumb" aria-label="Breadcrumb halaman">
          {breadcrumb.map((crumb, index) => {
            const isLast = index === breadcrumb.length - 1
            return (
              <span key={crumb.id} className="breadcrumb-item">
                {index > 0 && <span className="breadcrumb-sep">/</span>}
                {isLast ? (
                  <span className="breadcrumb-current">{crumb.title || 'Tanpa judul'}</span>
                ) : (
                  <button type="button" onClick={() => onSelectPage(crumb.id)}>
                    {crumb.title || 'Tanpa judul'}
                  </button>
                )}
              </span>
            )
          })}
        </nav>
      )}

      <textarea
        ref={titleRef}
        className="page-title"
        rows={1}
        value={page.title}
        placeholder="Tanpa judul"
        aria-label="Judul halaman"
        onChange={(e) => onChangeTitle(e.target.value)}
      />

      <div className="blocks">
        {page.blocks.map((block) => (
          <BlockRow
            key={block.id}
            block={block}
            autoFocus={focusId.current === block.id}
            isDragging={dragId === block.id}
            isDragOver={overId === block.id && dragId !== block.id}
            onChangeText={(text) => updateBlock(block.id, { text })}
            onToggleTodo={() => updateBlock(block.id, { checked: !block.checked })}
            onEnter={() => insertAfter(block.id)}
            onBackspaceEmpty={() => removeBlock(block.id)}
            onChangeType={(type, text) =>
              updateBlock(block.id, {
                type,
                text: text ?? block.text,
                checked: type === 'todo' ? Boolean(block.checked) : undefined,
              })
            }
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
