import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from 'react'
import { BLOCK_GLYPH, clampIndent, filterSlashItems } from '../lib/blocks'
import { createDefaultDatabase } from '../lib/database'
import { askConfirm, askPrompt } from '@/lib/appDialog'
import { parseInlineMarkdown, wrapLink, wrapSelection } from '../lib/format'
import { formatMention, resolveMentionPage, splitMentions } from '../lib/mentions'
import type { Block, BlockType, CalloutTone, Page, Task } from '../types'
import { isClickUpTaskUrl } from '@/lib/clickup'
import { LocalImage } from './LocalImage'
import { ClickUpEmbedCard } from './ClickUpEmbedCard'
import { DatabaseBlock } from './DatabaseBlock'
import { FormatToolbar } from './FormatToolbar'
import { SlashMenu } from './SlashMenu'

type Props = {
  block: Block
  numberLabel?: number
  pages: Page[]
  tasks?: Task[]
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
  onOpenTask?: (taskId: string) => void
  onPromoteToTask?: (title: string) => void
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
  tasks = [],
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
  onOpenTask,
  onPromoteToTask,
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
  const [editing, setEditing] = useState(false)
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
    if (autoFocus) {
      setEditing(true)
      ref.current?.focus()
    }
  }, [autoFocus])

  const showRichPreview =
    !editing &&
    block.type !== 'code' &&
    block.type !== 'database' &&
    Boolean(block.text) &&
    /(\*\*|\*[^*]|`|\[.+\]\(|\[\[)/.test(block.text)

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
      void (async () => {
        const useFile = await askConfirm('Sumber gambar', {
          description: 'Unggah file lokal, atau batalkan untuk memakai URL.',
          confirmLabel: 'Unggah file',
          cancelLabel: 'Pakai URL',
        })
        let imageUrl = ''
        if (useFile) {
          const { pickLocalFile, storeLocalFile } = await import('@/lib/media')
          const file = await pickLocalFile('image/*')
          if (file) imageUrl = await storeLocalFile(file)
        } else {
          imageUrl =
            (await askPrompt('URL gambar', block.imageUrl || 'https://', {
              placeholder: 'https://…',
              confirmLabel: 'Pasang',
            })) ?? ''
        }
        onChange({
          type,
          text: '',
          imageUrl,
          embedUrl: undefined,
          checked: undefined,
          calloutTone: undefined,
          collapsed: undefined,
          database: undefined,
        })
      })()
    } else if (type === 'embed' || type === 'bookmark') {
      void (async () => {
        const url = await askPrompt(
          type === 'embed' ? 'URL embed' : 'URL bookmark',
          block.embedUrl || 'https://',
          {
            description:
              type === 'embed'
                ? 'YouTube, Figma, atau situs lain.'
                : 'Tautan yang akan ditampilkan sebagai kartu.',
            placeholder: 'https://…',
            confirmLabel: 'Pasang',
          },
        )
        onChange({
          type,
          text: type === 'bookmark' ? url || '' : '',
          embedUrl: url || '',
          imageUrl: undefined,
          database: undefined,
          checked: undefined,
          calloutTone: undefined,
          collapsed: undefined,
        })
      })()
    } else if (type === 'database') {
      onTurnInto(type)
    } else {
      onTurnInto(type)
      onChange({ text: '', database: undefined, embedUrl: undefined })
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
    const token = formatMention(page)
    const next = `${block.text.slice(0, at)}${token}${block.text.slice(caret)}`
    onChange({ text: next })
    onMentionPage(page)
    setMentionOpen(false)
    requestAnimationFrame(() => {
      const pos = at + token.length
      el.focus()
      el.setSelectionRange(pos, pos)
    })
  }

  const mentionParts = splitMentions(block.text).filter((p) => p.kind === 'mention')

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
    const start = el.selectionStart
    const end = el.selectionEnd
    void askPrompt('URL tautan', 'https://', {
      placeholder: 'https://…',
      confirmLabel: 'Pasang',
    }).then((url) => {
      if (!url) return
      const result = wrapLink(block.text, start, end, url)
      onChange({ text: result.value })
      requestAnimationFrame(() => {
        el.focus()
        el.setSelectionRange(result.start, result.end)
        autoResize(el)
      })
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
            pages={pages}
            tasks={tasks}
            onChangeTitle={(text) => onChange({ text })}
            onChange={(database) => onChange({ database })}
            onDeleteBlock={onDelete}
            onOpenPage={(id) => {
              const page = pages.find((p) => p.id === id)
              if (page) onMentionPage(page)
            }}
            onOpenTask={onOpenTask}
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
            aria-label="Seret divider"
          >
            ⋮⋮
          </button>
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
        <div className="block-body divider-body" style={{ paddingLeft: indent * 24 }}>
          <hr className="block-divider" />
        </div>
      </div>
    )
  }

  const showMark =
    block.type === 'bullet' ||
    block.type === 'numbered' ||
    block.type === 'todo' ||
    block.type === 'toggle' ||
    block.type === 'callout' ||
    block.type === 'comment'

  return (
    <div
      className={[
        'block-row group/block',
        block.type === 'todo' && block.checked ? 'todo-done' : '',
        block.type === 'callout'
          ? `callout callout-${block.calloutTone ?? 'info'}`
          : block.type === 'comment'
            ? 'callout'
            : '',
        block.type === 'quote' ? 'is-quote' : '',
        block.type === 'toggle' ? 'is-toggle' : '',
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
            {onPromoteToTask && (
              <button
                type="button"
                onClick={() => {
                  onPromoteToTask(block.text)
                  setMenuOpen(false)
                }}
              >
                Kirim ke Tugas
              </button>
            )}
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

      <div className="block-body" style={{ paddingLeft: indent * 24 }}>
        {showMark && (
          <div className="block-mark" aria-hidden={block.type !== 'todo' && block.type !== 'toggle'}>
            {block.type === 'bullet' && <span>•</span>}
            {block.type === 'numbered' && <span className="block-mark-num">{numberLabel}.</span>}
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
            {block.type === 'callout' && <span>💡</span>}
            {block.type === 'comment' && <span>💬</span>}
          </div>
        )}

        <div className="block-main">
          {block.type === 'callout' && (
            <div className="callout-tones">
              {(['info', 'warn', 'success'] as CalloutTone[]).map((tone) => (
                <button
                  key={tone}
                  type="button"
                  className={`rounded px-1.5 py-0.5 text-[0.65rem] ${
                    (block.calloutTone ?? 'info') === tone
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                  onClick={() => onChange({ calloutTone: tone })}
                >
                  {tone}
                </button>
              ))}
            </div>
          )}

          {block.type === 'image' && block.imageUrl ? (
            <LocalImage className="block-image" src={block.imageUrl} alt={block.text || 'gambar'} />
          ) : null}

          {block.type === 'embed' && block.embedUrl ? (
            isClickUpTaskUrl(block.embedUrl) ? (
              <ClickUpEmbedCard
                url={block.embedUrl}
                onChangeUrl={(embedUrl) => onChange({ embedUrl })}
              />
            ) : (
              <div className="mb-2 overflow-hidden rounded-lg border border-border">
                <iframe
                  title="Embed"
                  src={block.embedUrl}
                  className="aspect-video w-full bg-muted"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              </div>
            )
          ) : null}
          {block.type === 'embed' && !block.embedUrl ? (
            <ClickUpEmbedCard
              url=""
              onChangeUrl={(embedUrl) => onChange({ embedUrl })}
            />
          ) : null}

          {block.type === 'bookmark' && block.embedUrl ? (
            <a
              href={block.embedUrl}
              target="_blank"
              rel="noreferrer"
              className="mb-2 block rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"
            >
              <div className="font-medium">{block.text || 'Bookmark'}</div>
              <div className="truncate text-xs text-muted-foreground">{block.embedUrl}</div>
            </a>
          ) : null}

          {!(block.type === 'toggle' && block.collapsed) && (
            <div className="relative min-w-0 flex-1">
              {showRichPreview && (
                <div
                  role="button"
                  tabIndex={0}
                  className="block-input block-rich-preview w-full cursor-text text-left"
                  data-type={block.type}
                  onClick={() => {
                    setEditing(true)
                    requestAnimationFrame(() => ref.current?.focus())
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setEditing(true)
                      requestAnimationFrame(() => ref.current?.focus())
                    }
                  }}
                >
                  {splitMentions(block.text).map((mPart, mi) => {
                    if (mPart.kind === 'mention') {
                      const target = resolveMentionPage(pages, mPart)
                      return (
                        <button
                          key={`m-${mi}`}
                          type="button"
                          className="mx-0.5 inline-flex items-center gap-1 rounded-md bg-accent px-1.5 py-0.5 align-baseline text-[0.92em] font-medium text-accent-foreground hover:opacity-90"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (target) onMentionPage(target)
                          }}
                          title={
                            target ? `Buka ${target.title}` : 'Halaman tidak ditemukan'
                          }
                        >
                          <span aria-hidden>{target?.icon ?? '📄'}</span>
                          {mPart.label}
                        </button>
                      )
                    }
                    return (
                      <span key={`t-${mi}`}>
                        {parseInlineMarkdown(mPart.value).map((part, i) => {
                          if (part.kind === 'bold') {
                            return <strong key={i}>{part.text}</strong>
                          }
                          if (part.kind === 'italic') {
                            return <em key={i}>{part.text}</em>
                          }
                          if (part.kind === 'code') {
                            return (
                              <code
                                key={i}
                                className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]"
                              >
                                {part.text}
                              </code>
                            )
                          }
                          if (part.kind === 'link') {
                            return (
                              <a
                                key={i}
                                href={part.href}
                                className="text-primary underline underline-offset-2"
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {part.text}
                              </a>
                            )
                          }
                          return <span key={i}>{part.text}</span>
                        })}
                      </span>
                    )
                  })}
                </div>
              )}
              <textarea
                ref={ref}
                className="block-input"
                data-type={block.type}
                rows={1}
                value={block.text}
                hidden={showRichPreview}
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
                              : block.type === 'comment'
                                ? 'Komentar…'
                                : block.type === 'image'
                                  ? 'Caption…'
                                  : block.type === 'embed'
                                    ? 'Catatan embed…'
                                    : block.type === 'bookmark'
                                      ? 'Judul bookmark…'
                                      : block.type === 'toggle'
                                        ? 'Judul toggle…'
                                        : 'Ketik / untuk perintah, @ untuk halaman'
                }
                onFocus={() => setEditing(true)}
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
                    setEditing(false)
                  }, 150)
                }}
              />
            </div>
          )}

          {/* Chip mention hanya saat edit — preview sudah render pill inline */}
          {editing && mentionParts.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {mentionParts.map((part, i) => {
                if (part.kind !== 'mention') return null
                const target = resolveMentionPage(pages, part)
                return (
                  <button
                    key={`${part.label}-${i}`}
                    type="button"
                    className="rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground hover:opacity-90"
                    onClick={() => target && onMentionPage(target)}
                    disabled={!target}
                    title={target ? `Buka ${target.title}` : 'Halaman tidak ditemukan'}
                  >
                    {target?.icon ?? '📄'} {part.label}
                  </button>
                )
              })}
            </div>
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
