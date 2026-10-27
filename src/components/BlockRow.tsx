import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from 'react'
import { BLOCK_GLYPH, clampIndent, filterSlashItems } from '../lib/blocks'
import { createDefaultDatabase } from '../lib/database'
import { wrapLink, wrapSelection } from '../lib/format'
import type { Block, BlockType, Page } from '../types'
import { DatabaseBlock } from './DatabaseBlock'
import { FormatToolbar } from './FormatToolbar'
import { SlashMenu } from './SlashMenu'

type Props = {
  block: Block
  numberLabel?: number
  pages: Page[]
  autoFocus?: boolean
  isDragging?: boolean
  isDragOver?: boolean
  onChange: (patch: Partial<Block>) => void
  onEnter: () => void
  onBackspaceEmpty: () => void
  onIndent: (delta: number) => void
  onDuplicate: () => void
  onDelete: () => void
  onTurnInto: (type: BlockType) => void
  onMentionPage: (page: Page) => void
  onDragStart: (id: string) => void
  onDragOver: (id: string) => void
  onDrop: (id: string) => void
  onDragEnd: () => void
}

function autoResize(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

export function BlockRow({
  block,
  numberLabel = 1,
  pages,
  autoFocus,
  isDragging,
  isDragOver,
  onChange,
  onEnter,
  onBackspaceEmpty,
  onIndent,
  onDuplicate,
  onDelete,
  onTurnInto,
  onMentionPage,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [slashOpen, setSlashOpen] = useState(false)
  const [slashQuery, setSlashQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [showFormat, setShowFormat] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [mentionOpen, setMentionOpen] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionIndex, setMentionIndex] = useState(0)

  const items = filterSlashItems(slashQuery)
  const indent = clampIndent(block.indent)
  const mentionHits = pages
    .filter((p) => !p.deletedAt)
    .filter((p) => {
      const q = mentionQuery.toLowerCase()
      if (!q) return true
      return (p.title || '').toLowerCase().includes(q) || p.icon.includes(q)
    })
    .slice(0, 8)

  useEffect(() => {
    autoResize(ref.current)
  }, [block.text, block.type])

  useEffect(() => {
    if (autoFocus) ref.current?.focus()
  }, [autoFocus])

  useEffect(() => {
    setActiveIndex(0)
  }, [slashQuery])

  useEffect(() => {
    setMentionIndex(0)
  }, [mentionQuery])

  function syncMenus(value: string, caret: number) {
    if (value.startsWith('/')) {
      setSlashOpen(true)
      setSlashQuery(value.slice(1))
      setMentionOpen(false)
      return
    }
    setSlashOpen(false)
    setSlashQuery('')

    const before = value.slice(0, caret)
    const at = before.lastIndexOf('@')
    if (at >= 0 && (at === 0 || /\s/.test(before[at - 1]!))) {
      const q = before.slice(at + 1)
      if (!q.includes(' ')) {
        setMentionOpen(true)
        setMentionQuery(q)
        return
      }
    }
    setMentionOpen(false)
    setMentionQuery('')
  }

  function applySlash(type: BlockType) {
    if (type === 'image') {
      const url = window.prompt('URL gambar', block.imageUrl || 'https://')
      onChange({
        type,
        text: '',
        imageUrl: url?.trim() || '',
        checked: undefined,
        calloutTone: undefined,
        collapsed: undefined,
        database: undefined,
      })
    } else if (type === 'database') {
      onTurnInto(type)
    } else {
      onTurnInto(type)
      onChange({ text: '', database: undefined })
    }
    setSlashOpen(false)
    setSlashQuery('')
    requestAnimationFrame(() => ref.current?.focus())
  }

  function applyMention(page: Page) {
    const el = ref.current
    if (!el) return
    const caret = el.selectionStart
    const before = block.text.slice(0, caret)
    const at = before.lastIndexOf('@')
    if (at < 0) return
    const next = `${block.text.slice(0, at)}[[${page.title || 'Tanpa judul'}]]${block.text.slice(caret)}`
    onChange({ text: next })
    onMentionPage(page)
    setMentionOpen(false)
    requestAnimationFrame(() => {
      const pos = at + 2 + (page.title || 'Tanpa judul').length + 2
      el.focus()
      el.setSelectionRange(pos, pos)
    })
  }

  function applyWrap(before: string, after?: string) {
    const el = ref.current
    if (!el) return
    const result = wrapSelection(block.text, el.selectionStart, el.selectionEnd, before, after)
    onChange({ text: result.value })
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(result.start, result.end)
      autoResize(el)
    })
  }

  function applyLink() {
    const el = ref.current
    if (!el) return
    const url = window.prompt('URL tautan', 'https://')
    if (!url) return
    const result = wrapLink(block.text, el.selectionStart, el.selectionEnd, url.trim())
    onChange({ text: result.value })
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(result.start, result.end)
    })
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMentionIndex((i) => (i + 1) % Math.max(mentionHits.length, 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMentionIndex(
          (i) => (i - 1 + Math.max(mentionHits.length, 1)) % Math.max(mentionHits.length, 1),
        )
        return
      }
      if (e.key === 'Enter' && mentionHits[mentionIndex]) {
        e.preventDefault()
        applyMention(mentionHits[mentionIndex])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setMentionOpen(false)
        return
      }
    }

    if (slashOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => (i + 1) % Math.max(items.length, 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => (i - 1 + Math.max(items.length, 1)) % Math.max(items.length, 1))
        return
      }
      if (e.key === 'Enter' && items[activeIndex]) {
        e.preventDefault()
        applySlash(items[activeIndex].type)
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setSlashOpen(false)
        return
      }
    }

    if (e.key === 'Tab') {
      e.preventDefault()
      onIndent(e.shiftKey ? -1 : 1)
      return
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onEnter()
      return
    }

    if (e.key === 'Backspace' && block.text === '' && block.type !== 'divider') {
      e.preventDefault()
      onBackspaceEmpty()
    }
  }

  function handleDragStart(e: DragEvent) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', block.id)
    onDragStart(block.id)
  }

  if (block.type === 'database') {
    const db = block.database ?? createDefaultDatabase(block.text || 'Database')
    return (
      <div
        className={[
          'block-row database-row',
          isDragging ? 'is-dragging' : '',
          isDragOver ? 'is-drag-over' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onDragOver={(e) => {
          e.preventDefault()
          onDragOver(block.id)
        }}
        onDrop={(e) => {
          e.preventDefault()
          onDrop(block.id)
        }}
      >
        <div className="block-controls">
          <button
            type="button"
            className="block-handle"
            tabIndex={-1}
            draggable
            onDragStart={handleDragStart}
            onDragEnd={onDragEnd}
            aria-label="Seret database"
          >
            ⋮⋮
          </button>
        </div>
        <div className="block-body">
          <DatabaseBlock
            title={block.text || 'Database'}
            data={db}
            onChangeTitle={(text) => onChange({ text })}
            onChange={(database) => onChange({ database })}
            onDeleteBlock={onDelete}
          />
        </div>
      </div>
    )
  }

  if (block.type === 'divider') {
    return (
      <div
        className={[
          'block-row divider-row',
          isDragging ? 'is-dragging' : '',
          isDragOver ? 'is-drag-over' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{ paddingLeft: indent * 24 }}
        onDragOver={(e) => {
          e.preventDefault()
          onDragOver(block.id)
        }}
        onDrop={(e) => {
          e.preventDefault()
          onDrop(block.id)
        }}
      >
        <button
          type="button"
          className="block-handle"
          tabIndex={-1}
          draggable
          onDragStart={handleDragStart}
          onDragEnd={onDragEnd}
          aria-label="Seret divider"
        >
          ⋮⋮
        </button>
        <div className="block-body divider-body">
          <hr className="block-divider" />
          <button type="button" className="block-more" onClick={() => setMenuOpen((v) => !v)}>
            ⋯
          </button>
          {menuOpen && (
            <div className="block-menu">
              <button type="button" onClick={() => { onDuplicate(); setMenuOpen(false) }}>
                Duplikat
              </button>
              <button type="button" className="danger" onClick={() => { onDelete(); setMenuOpen(false) }}>
                Hapus
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className={[
        'block-row',
        block.type === 'todo' && block.checked ? 'todo-done' : '',
        block.type === 'callout' ? `callout callout-${block.calloutTone ?? 'info'}` : '',
        block.type === 'quote' ? 'is-quote' : '',
        block.type === 'toggle' ? 'is-toggle' : '',
        isDragging ? 'is-dragging' : '',
        isDragOver ? 'is-drag-over' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ paddingLeft: indent * 24 }}
      onDragOver={(e) => {
        e.preventDefault()
        onDragOver(block.id)
      }}
      onDrop={(e) => {
        e.preventDefault()
        onDrop(block.id)
      }}
    >
      <div className="block-controls">
        <button
          type="button"
          className="block-handle"
          tabIndex={-1}
          aria-label="Seret untuk mengurutkan blok"
          title="Seret"
          draggable
          onDragStart={handleDragStart}
          onDragEnd={onDragEnd}
        >
          ⋮⋮
        </button>
        <button
          type="button"
          className="block-more"
          tabIndex={-1}
          aria-label="Menu blok"
          onClick={() => setMenuOpen((v) => !v)}
        >
          ⋯
        </button>
        {menuOpen && (
          <div className="block-menu">
            <button type="button" onClick={() => { onDuplicate(); setMenuOpen(false) }}>
              Duplikat
            </button>
            <button type="button" onClick={() => { onTurnInto('paragraph'); setMenuOpen(false) }}>
              Jadi teks
            </button>
            <button type="button" onClick={() => { onIndent(1); setMenuOpen(false) }}>
              Indent
            </button>
            <button type="button" onClick={() => { onIndent(-1); setMenuOpen(false) }}>
              Outdent
            </button>
            <button type="button" className="danger" onClick={() => { onDelete(); setMenuOpen(false) }}>
              Hapus
            </button>
          </div>
        )}
      </div>

      <div className="block-body">
        {block.type === 'bullet' && <span className="bullet-mark">•</span>}
        {block.type === 'numbered' && <span className="bullet-mark">{numberLabel}.</span>}
        {block.type === 'todo' && (
          <input
            className="todo-check"
            type="checkbox"
            checked={Boolean(block.checked)}
            onChange={() => onChange({ checked: !block.checked })}
            aria-label="Centang to-do"
          />
        )}
        {block.type === 'toggle' && (
          <button
            type="button"
            className="toggle-twist"
            aria-label={block.collapsed ? 'Bentangkan' : 'Ciutkan'}
            onClick={() => onChange({ collapsed: !block.collapsed })}
          >
            {block.collapsed ? '▸' : '▾'}
          </button>
        )}
        {block.type === 'callout' && <span className="callout-mark">💡</span>}

        <div className="block-main">
          {block.type === 'image' && block.imageUrl ? (
            <img className="block-image" src={block.imageUrl} alt={block.text || 'gambar'} />
          ) : null}

          {!(block.type === 'toggle' && block.collapsed) && (
            <textarea
              ref={ref}
              className="block-input"
              data-type={block.type}
              rows={1}
              value={block.text}
              placeholder={
                block.type === 'heading1'
                  ? 'Heading 1'
                  : block.type === 'heading2'
                    ? 'Heading 2'
                    : block.type === 'heading3'
                      ? 'Heading 3'
                      : block.type === 'code'
                        ? 'Kode…'
                        : block.type === 'quote'
                          ? 'Kutipan…'
                          : block.type === 'callout'
                            ? 'Callout…'
                            : block.type === 'image'
                              ? 'Caption…'
                              : block.type === 'toggle'
                                ? 'Judul toggle…'
                                : 'Ketik / untuk perintah, @ untuk halaman'
              }
              onChange={(e) => {
                const value = e.target.value
                onChange({ text: value })
                syncMenus(value, e.target.selectionStart)
                autoResize(e.target)
              }}
              onKeyDown={onKeyDown}
              onSelect={(e) => {
                const el = e.currentTarget
                setShowFormat(el.selectionStart !== el.selectionEnd)
                syncMenus(el.value, el.selectionStart)
              }}
              onBlur={() => {
                window.setTimeout(() => {
                  setShowFormat(false)
                  setMenuOpen(false)
                }, 150)
              }}
            />
          )}

          {block.type === 'toggle' && block.collapsed && (
            <button
              type="button"
              className="toggle-collapsed-label"
              onClick={() => onChange({ collapsed: false })}
            >
              {block.text || 'Toggle'}
            </button>
          )}

          {showFormat && (
            <FormatToolbar
              onBold={() => applyWrap('**')}
              onItalic={() => applyWrap('*')}
              onCode={() => applyWrap('`')}
              onLink={applyLink}
            />
          )}
        </div>
      </div>

      {slashOpen && (
        <SlashMenu
          items={items}
          activeIndex={activeIndex}
          onHover={setActiveIndex}
          onSelect={applySlash}
        />
      )}

      {mentionOpen && mentionHits.length > 0 && (
        <div className="mention-menu" role="listbox" aria-label="Sebut halaman">
          {mentionHits.map((page, i) => (
            <button
              key={page.id}
              type="button"
              className={`mention-item${i === mentionIndex ? ' active' : ''}`}
              onMouseEnter={() => setMentionIndex(i)}
              onMouseDown={(e) => {
                e.preventDefault()
                applyMention(page)
              }}
            >
              <span>{page.icon}</span>
              <span>{page.title || 'Tanpa judul'}</span>
            </button>
          ))}
        </div>
      )}

      <span className="sr-only">{BLOCK_GLYPH[block.type]}</span>
    </div>
  )
}
