import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckSquare, Copy, History, ImageIcon, Link2, MessageSquare, Plus, Star, Trash2, Unlink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { collectBacklinks } from '@/lib/backlinks'
import { askPrompt } from '@/lib/appDialog'
import { clampIndent, createBlock, isHiddenUnderCollapsedToggle } from '@/lib/blocks'
import { createDefaultDatabase } from '@/lib/database'
import { createId } from '@/lib/id'
import { splitMentions } from '@/lib/mentions'
import type { PresencePeer } from '@/lib/realtime'
import { isDoneStatus } from '@/lib/tasks'
import { numberedLabel, reorderBlocks } from '@/lib/pages'
import { getPageSnapshot, listPageHistory, pushPageSnapshot } from '@/lib/pageHistory'
import { COVER_PRESETS, PAGE_ICONS, coverCss } from '@/lib/storage'
import type { Block, BlockType, Page, Task, TaskStatus } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Kbd } from '@/components/ui/kbd'
import { Textarea } from '@/components/ui/textarea'
import { BlockRow } from './BlockRow'

type Props = {
  page: Page
  pages: Page[]
  breadcrumb: Page[]
  linkedTasks?: Task[]
  /** Semua task workspace — untuk kolom relation DB */
  allTasks?: Task[]
  taskStatuses?: TaskStatus[]
  onChangePage: (partial: Partial<Page>) => void
  onChangeBlocks: (blocks: Block[]) => void
  onSelectPage: (id: string) => void
  onCreateChild: (parentId: string) => void
  onDuplicatePage: () => void
  onSoftDelete?: () => void
  onPromoteToTask?: (title: string) => void
  onCreateLinkedTask?: () => void
  onUnlinkTask?: (taskId: string) => void
  onOpenTask?: (taskId: string) => void
  onOpenTasks?: () => void
  authorName?: string
  presencePeers?: PresencePeer[]
}

export function Editor({
  page,
  pages,
  breadcrumb,
  linkedTasks = [],
  allTasks = [],
  taskStatuses = [],
  onChangePage,
  onChangeBlocks,
  onSelectPage,
  onCreateChild,
  onDuplicatePage,
  onSoftDelete,
  onPromoteToTask,
  onCreateLinkedTask,
  onUnlinkTask,
  onOpenTask,
  onOpenTasks,
  authorName = 'Kamu',
  presencePeers = [],
}: Props) {
  const focusId = useRef<string | null>(null)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [iconOpen, setIconOpen] = useState(false)
  const [coverOpen, setCoverOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [commentDraft, setCommentDraft] = useState('')
  const openComments = (page.comments ?? []).filter((c) => !c.resolvedAt)
  const commentCount = openComments.length
  const backlinks = useMemo(() => collectBacklinks(pages, page.id), [pages, page.id])
  const pagePeers = presencePeers.filter((p) => p.pageId === page.id)
  const snapshots = useMemo(
    () => (historyOpen ? listPageHistory(page.id) : []),
    [historyOpen, page.id, page.updatedAt],
  )

  function submitComment() {
    const text = commentDraft.trim()
    if (!text) return
    const mentionPageIds = splitMentions(text)
      .filter((p) => p.kind === 'mention' && p.pageId)
      .map((p) => (p.kind === 'mention' ? p.pageId! : ''))
      .filter(Boolean)
    onChangePage({
      comments: [
        ...(page.comments ?? []),
        {
          id: createId('cmt'),
          text,
          createdAt: Date.now(),
          author: authorName,
          mentionPageIds,
          resolvedAt: null,
        },
      ],
    })
    setCommentDraft('')
  }

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
      embedUrl: type === 'embed' || type === 'bookmark' ? '' : undefined,
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
        <div className="mb-3 flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
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
          <div className="flex flex-wrap gap-2">
            <Input
              className="h-8 max-w-sm"
              placeholder="URL gambar cover…"
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                const url = (e.target as HTMLInputElement).value.trim()
                if (!url) return
                onChangePage({ cover: url })
                setCoverOpen(false)
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                void askPrompt('URL cover', 'https://', {
                  placeholder: 'https://…',
                  confirmLabel: 'Pasang',
                }).then((url) => {
                  if (!url) return
                  onChangePage({ cover: url })
                  setCoverOpen(false)
                })
              }}
            >
              Pakai URL
            </Button>
          </div>
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

      <div className="group/hero mb-1">
        <button
          type="button"
          className="mb-1 flex size-14 items-center justify-center rounded-md text-[2rem] leading-none transition-colors hover:bg-muted/60"
          onClick={() => setIconOpen((v) => !v)}
          aria-label="Ganti ikon"
        >
          {page.icon}
        </button>
        <div className="mb-2 flex flex-wrap items-center gap-0.5 opacity-0 transition-opacity group-hover/hero:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100">
          {!page.cover && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="h-6 text-muted-foreground"
              onClick={() => setCoverOpen(true)}
            >
              <ImageIcon className="size-3" /> Cover
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="h-6 text-muted-foreground"
            onClick={() => onChangePage({ favorite: !page.favorite })}
          >
            <Star className={cn('size-3', page.favorite && 'fill-current text-amber-500')} />
            Favorit
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="h-6 text-muted-foreground"
            onClick={() => onCreateChild(page.id)}
          >
            <Plus className="size-3" /> Sub-halaman
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="h-6 text-muted-foreground"
            onClick={onDuplicatePage}
          >
            <Copy className="size-3" /> Duplikat
          </Button>
          {onSoftDelete && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="h-6 text-muted-foreground"
              onClick={onSoftDelete}
            >
              <Trash2 className="size-3" /> Hapus
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="h-6 text-muted-foreground"
            aria-expanded={commentsOpen}
            onClick={() => setCommentsOpen((v) => !v)}
          >
            <MessageSquare className="size-3" />
            Komentar{commentCount > 0 ? ` ${commentCount}` : ''}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="h-6 text-muted-foreground"
            onClick={() => {
              pushPageSnapshot(page)
              setHistoryOpen((v) => !v)
            }}
          >
            <History className="size-3" /> Riwayat
          </Button>
        </div>
      </div>

      {historyOpen && (
        <div className="mb-4 rounded-lg border border-border p-3">
          <div className="mb-2 text-sm font-medium">Riwayat lokal halaman</div>
          {snapshots.length === 0 ? (
            <p className="text-xs text-muted-foreground">Belum ada snapshot. Klik Riwayat lagi setelah mengedit.</p>
          ) : (
            <ul className="space-y-1">
              {snapshots.map((snap) => (
                <li key={snap.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-muted-foreground">
                    {new Date(snap.savedAt).toLocaleString('id-ID')} · {snap.title}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const found = getPageSnapshot(page.id, snap.id)
                      if (found) onChangePage(found.page)
                    }}
                  >
                    Pulihkan
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {iconOpen && (
        <div className="mb-4 flex flex-wrap gap-1">
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
        className="mb-1 min-h-0 resize-none rounded-none border-0 bg-transparent px-0 py-0 text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.2] font-bold tracking-tight shadow-none focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent md:text-[clamp(1.75rem,3vw,2.5rem)]"
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

      <div className="flex flex-col gap-px">
        {page.blocks.map((block) => {
          if (isHiddenUnderCollapsedToggle(page.blocks, block.id)) return null
          return (
            <BlockRow
              key={block.id}
              block={block}
              pages={pages}
              tasks={allTasks}
              numberLabel={numberedLabel(page.blocks, block.id)}
              autoFocus={focusId.current === block.id}
              isDragging={dragId === block.id}
              isDragOver={overId === block.id && dragId !== block.id}
              onChange={(patch) => updateBlock(block.id, patch)}
              onEnter={() => insertAfter(block.id)}
              onBackspaceEmpty={() => removeBlock(block.id)}
              onIndent={(delta) =>
                updateBlock(block.id, {
                  indent: clampIndent((block.indent ?? 0) + delta),
                })
              }
              onDuplicate={() => duplicateBlock(block.id)}
              onDelete={() => removeBlock(block.id)}
              onTurnInto={(type) => turnInto(block.id, type)}
              onMentionPage={(target) => onSelectPage(target.id)}
              onOpenTask={onOpenTask}
              onPromoteToTask={onPromoteToTask}
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
          )
        })}
      </div>

      {pagePeers.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          <span>Sedang melihat:</span>
          {pagePeers.map((p) => (
            <span
              key={p.clientId}
              className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5"
            >
              <span className="size-1.5 rounded-full" style={{ background: p.color ?? '#0F766E' }} />
              {p.name}
            </span>
          ))}
        </div>
      )}

      <section className="mt-8 border-t border-border/50 pt-4 pb-5">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[12px] font-medium text-muted-foreground">
            <CheckSquare className="size-3.5" />
            Tugas terkait
            {linkedTasks.length > 0 && (
              <span className="text-[11px] font-normal tabular-nums">
                {linkedTasks.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            {onCreateLinkedTask && (
              <Button type="button" variant="ghost" size="xs" className="h-7" onClick={onCreateLinkedTask}>
                <Plus className="size-3.5" /> Tugas
              </Button>
            )}
            {onOpenTasks && (
              <Button type="button" variant="ghost" size="xs" className="h-7 text-muted-foreground" onClick={onOpenTasks}>
                Buka
              </Button>
            )}
          </div>
        </div>
        {linkedTasks.length === 0 ? (
          <p className="text-[12px] leading-relaxed text-muted-foreground/80">Belum tertaut.</p>
        ) : (
          <ul className="space-y-1">
            {linkedTasks.map((task) => {
              const st = taskStatuses.find((s) => s.id === task.statusId)
              const done = isDoneStatus(taskStatuses, task.statusId)
              return (
                <li
                  key={task.id}
                  className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/40"
                >
                  <span
                    className="size-1.5 shrink-0 rounded-full"
                    style={{ background: st?.color ?? '#64748b' }}
                  />
                  <span
                    className={cn(
                      'min-w-0 flex-1 truncate text-[13px]',
                      done && 'text-muted-foreground line-through',
                    )}
                  >
                    {task.title || 'Tanpa judul'}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {st?.name}
                  </span>
                  {onUnlinkTask && (
                    <button
                      type="button"
                      className="flex size-6 items-center justify-center rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-foreground"
                      title="Lepas tautan"
                      onClick={() => onUnlinkTask(task.id)}
                    >
                      <Unlink className="size-3.5" />
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="border-t border-border/50 pt-4 pb-8">
        <div className="mb-2.5 flex items-center gap-2 text-[12px] font-medium text-muted-foreground">
          <Link2 className="size-3.5" /> Backlinks
          {backlinks.length > 0 && (
            <span className="text-[11px] font-normal tabular-nums">{backlinks.length}</span>
          )}
        </div>
        {backlinks.length === 0 ? (
          <p className="text-[12px] leading-relaxed text-muted-foreground/80">
            Belum ada halaman yang menyebut ini.
          </p>
        ) : (
          <ul className="space-y-1">
            {backlinks.map((hit) => (
              <li key={`${hit.pageId}-${hit.blockId}`}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted/40"
                  onClick={() => onSelectPage(hit.pageId)}
                >
                  <span className="text-sm">{hit.icon}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px]">{hit.title}</span>
                  <span className="max-w-[40%] truncate text-[11px] text-muted-foreground">
                    {hit.snippet}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {commentsOpen && (
        <section className="mt-6 border-t border-border/50 pt-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[12px] font-medium text-muted-foreground">
              <MessageSquare className="size-3.5" /> Komentar
            </div>
            <Button type="button" variant="ghost" size="xs" className="h-7" onClick={() => setCommentsOpen(false)}>
              Tutup
            </Button>
          </div>
          <ul className="mb-2 space-y-1.5">
            {(page.comments ?? []).length === 0 && (
              <li className="text-[12px] text-muted-foreground/80">Belum ada komentar.</li>
            )}
            {(page.comments ?? []).map((c) => (
              <li
                key={c.id}
                className={cn(
                  'rounded-md bg-muted/40 px-2.5 py-2 text-[13px]',
                  c.resolvedAt && 'opacity-60',
                )}
              >
                <div className="mb-0.5 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
                  <span>
                    {c.author || 'Anonim'} · {new Date(c.createdAt).toLocaleString('id-ID')}
                    {c.resolvedAt ? ' · terselesaikan' : ''}
                  </span>
                  {!c.resolvedAt && (
                    <button
                      type="button"
                      className="underline-offset-2 hover:underline"
                      onClick={() =>
                        onChangePage({
                          comments: (page.comments ?? []).map((x) =>
                            x.id === c.id ? { ...x, resolvedAt: Date.now() } : x,
                          ),
                        })
                      }
                    >
                      Resolve
                    </button>
                  )}
                </div>
                <div className={cn(c.resolvedAt && 'line-through')}>{c.text}</div>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Input
              className="h-8 max-w-md"
              placeholder="Tulis komentar… (bisa [[mention]])"
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  submitComment()
                }
              }}
            />
            <Button type="button" size="sm" onClick={submitComment}>
              Kirim
            </Button>
          </div>
        </section>
      )}
    </div>
  )
}
