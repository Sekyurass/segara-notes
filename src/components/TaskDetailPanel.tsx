import { useState, type ReactNode } from 'react'
import { Check, ChevronDown, Link2, Paperclip, Plus, Tag, Trash2, X } from 'lucide-react'
import { createId } from '@/lib/id'
import {
  PRIORITY_META,
  RECUR_META,
  checklistProgress,
  formatTimeSpent,
  isDoneStatus,
} from '@/lib/tasks'
import type {
  Page,
  Task,
  TaskPriority,
  TaskRecur,
  TaskStatus,
} from '@/types'
import { cn } from '@/lib/utils'
import { DatePickerField, TimePickerField } from '@/components/DateTimePickers'
import { StatusChip } from '@/components/taskUi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

type Props = {
  task: Task | null
  statuses: TaskStatus[]
  pages: Page[]
  knownTags?: string[]
  open: boolean
  onClose: () => void
  onChange: (partial: Partial<Task>) => void
  onDelete: () => void
  onOpenPage: (pageId: string) => void
}

const LABEL = 'text-[11px] font-medium text-muted-foreground'
const SECTION = 'flex flex-col gap-2'

export function TaskDetailPanel({
  task,
  statuses,
  pages,
  knownTags = [],
  open,
  onClose,
  onChange,
  onDelete,
  onOpenPage,
}: Props) {
  const [checkDraft, setCheckDraft] = useState('')
  const [attachName, setAttachName] = useState('')
  const [attachUrl, setAttachUrl] = useState('')
  const [tagDraft, setTagDraft] = useState('')

  if (!task) return null

  const status = statuses.find((s) => s.id === task.statusId)
  const progress = checklistProgress(task)
  const linked = task.pageId ? pages.find((p) => p.id === task.pageId) : null
  const checkPct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0
  const suggestTags = knownTags.filter((t) => !task.tags.includes(t)).slice(0, 8)

  function addCheck() {
    const text = checkDraft.trim()
    if (!text) return
    onChange({
      checklist: [...task!.checklist, { id: createId('chk'), text, checked: false }],
    })
    setCheckDraft('')
  }

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase()
    if (!tag || task!.tags.includes(tag)) {
      setTagDraft('')
      return
    }
    onChange({ tags: [...task!.tags, tag] })
    setTagDraft('')
  }

  function addAttach() {
    const url = attachUrl.trim()
    if (!url) return
    onChange({
      attachments: [
        ...task!.attachments,
        { id: createId('att'), name: attachName.trim() || 'Lampiran', url },
      ],
    })
    setAttachName('')
    setAttachUrl('')
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        <SheetHeader className="shrink-0 space-y-0 border-b border-border/60 px-5 py-4 pr-12 text-left">
          <SheetTitle className="sr-only">Detail tugas</SheetTitle>
          <Input
            value={task.title}
            onChange={(e) => onChange({ title: e.target.value })}
            className="h-auto border-0 bg-transparent px-0 text-lg font-semibold leading-snug shadow-none focus-visible:ring-0"
            placeholder="Tanpa judul"
          />
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
            {status && <StatusChip status={status} />}
            {progress.total > 0 && (
              <span className="tabular-nums">
                Checklist {progress.done}/{progress.total}
              </span>
            )}
          </div>
        </SheetHeader>

        <div className="segara-scroll min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-5">
            <section className="grid grid-cols-2 gap-x-3 gap-y-3">
              <Field label="Status">
                <DetailMenu
                  label={
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <span
                        className="size-1.5 shrink-0 rounded-full"
                        style={{ background: status?.color ?? '#64748b' }}
                      />
                      <span className="truncate">{status?.name ?? '—'}</span>
                    </span>
                  }
                >
                  {statuses.map((s) => (
                    <DropdownMenuItem key={s.id} onClick={() => onChange({ statusId: s.id })}>
                      <span className="size-2 rounded-full" style={{ background: s.color }} />
                      {s.name}
                      {s.id === task.statusId && <Check className="ml-auto size-3.5 opacity-70" />}
                    </DropdownMenuItem>
                  ))}
                </DetailMenu>
              </Field>

              <Field label="Prioritas">
                <DetailMenu
                  label={
                    <span
                      style={{
                        color:
                          task.priority === 'none'
                            ? undefined
                            : PRIORITY_META[task.priority].color,
                      }}
                    >
                      {PRIORITY_META[task.priority].label}
                    </span>
                  }
                >
                  {(Object.keys(PRIORITY_META) as TaskPriority[]).map((p) => (
                    <DropdownMenuItem key={p} onClick={() => onChange({ priority: p })}>
                      <span
                        className="size-2 rounded-full"
                        style={{
                          background:
                            p === 'none' ? 'var(--muted-foreground)' : PRIORITY_META[p].color,
                        }}
                      />
                      {PRIORITY_META[p].label}
                      {task.priority === p && <Check className="ml-auto size-3.5 opacity-70" />}
                    </DropdownMenuItem>
                  ))}
                </DetailMenu>
              </Field>

              <Field label="Start">
                <DatePickerField
                  value={task.startDate}
                  onChange={(startDate) => onChange({ startDate })}
                />
              </Field>

              <Field label="Due">
                <DatePickerField
                  value={task.dueDate}
                  onChange={(dueDate) => onChange({ dueDate })}
                />
              </Field>

              <Field label="Jam">
                <TimePickerField
                  value={task.dueTime}
                  onChange={(dueTime) => onChange({ dueTime })}
                />
              </Field>

              <Field label="Time">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="min-w-[3rem] text-xs font-medium tabular-nums">
                    {formatTimeSpent(task.timeSpentMinutes ?? 0)}
                  </span>
                  {[15, 30, 60].map((m) => (
                    <Button
                      key={m}
                      type="button"
                      size="xs"
                      variant="secondary"
                      onClick={() =>
                        onChange({
                          timeSpentMinutes: (task.timeSpentMinutes ?? 0) + m,
                        })
                      }
                    >
                      +{m}m
                    </Button>
                  ))}
                  {(task.timeSpentMinutes ?? 0) > 0 && (
                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      onClick={() => onChange({ timeSpentMinutes: 0 })}
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </Field>

              <Field label="Berulang">
                <DetailMenu label={RECUR_META[task.recur]}>
                  {(Object.keys(RECUR_META) as TaskRecur[]).map((r) => (
                    <DropdownMenuItem key={r} onClick={() => onChange({ recur: r })}>
                      {RECUR_META[r]}
                      {task.recur === r && <Check className="ml-auto size-3.5 opacity-70" />}
                    </DropdownMenuItem>
                  ))}
                </DetailMenu>
              </Field>

              <Field label="Assignee">
                <Input
                  value={task.assignee ?? ''}
                  onChange={(e) => onChange({ assignee: e.target.value || null })}
                  placeholder="Nama…"
                  className="h-8"
                  spellCheck={false}
                />
              </Field>
            </section>

            <section className={SECTION}>
              <div className={cn(LABEL, 'inline-flex items-center gap-1.5')}>
                <Tag className="size-3" /> Tags
              </div>
              <div className="flex flex-wrap gap-1.5">
                {task.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="inline-flex h-6 items-center gap-1 rounded-md bg-muted/70 px-2 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
                    title="Hapus tag"
                    onClick={() => onChange({ tags: task.tags.filter((t) => t !== tag) })}
                  >
                    {tag}
                    <X className="size-3 opacity-60" />
                  </button>
                ))}
                {task.tags.length === 0 && (
                  <span className="text-[12px] text-muted-foreground/70">Belum ada tag</span>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault()
                      addTag(tagDraft.replace(/,/g, ''))
                    }
                  }}
                  placeholder="Tambah tag…"
                  className="h-8"
                  spellCheck={false}
                />
                <Button type="button" size="sm" variant="secondary" onClick={() => addTag(tagDraft)}>
                  <Plus className="size-3.5" />
                </Button>
              </div>
              {suggestTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {suggestTags.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className="rounded-md border border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
                      onClick={() => addTag(t)}
                    >
                      + {t}
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className={SECTION}>
              <div className={LABEL}>Deskripsi</div>
              <Textarea
                value={task.description}
                onChange={(e) => onChange({ description: e.target.value })}
                placeholder="Catatan detail tugas…"
                className="min-h-24 resize-y text-[13px]"
              />
            </section>

            <section className={SECTION}>
              <div className="flex items-center justify-between gap-2">
                <span className={LABEL}>Checklist</span>
                {progress.total > 0 && (
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {progress.done}/{progress.total} · {checkPct}%
                  </span>
                )}
              </div>
              {progress.total > 0 && (
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-[width]"
                    style={{ width: `${checkPct}%` }}
                  />
                </div>
              )}
              <ul className="space-y-1">
                {task.checklist.map((item) => (
                  <li key={item.id} className="group flex items-center gap-2 rounded-md px-1 py-0.5 hover:bg-muted/30">
                    <button
                      type="button"
                      className={cn(
                        'flex size-4 shrink-0 items-center justify-center rounded border',
                        item.checked
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border',
                      )}
                      onClick={() =>
                        onChange({
                          checklist: task.checklist.map((c) =>
                            c.id === item.id ? { ...c, checked: !c.checked } : c,
                          ),
                        })
                      }
                    >
                      {item.checked && <Check className="size-3" />}
                    </button>
                    <input
                      value={item.text}
                      onChange={(e) =>
                        onChange({
                          checklist: task.checklist.map((c) =>
                            c.id === item.id ? { ...c, text: e.target.value } : c,
                          ),
                        })
                      }
                      className={cn(
                        'h-7 min-w-0 flex-1 border-0 bg-transparent text-[13px] outline-none',
                        item.checked && 'text-muted-foreground line-through',
                      )}
                    />
                    <button
                      type="button"
                      className="opacity-0 group-hover:opacity-100"
                      onClick={() =>
                        onChange({
                          checklist: task.checklist.filter((c) => c.id !== item.id),
                        })
                      }
                    >
                      <X className="size-3.5 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Input
                  value={checkDraft}
                  onChange={(e) => setCheckDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCheck()}
                  placeholder="Item checklist…"
                  className="h-8"
                />
                <Button type="button" size="sm" variant="secondary" onClick={addCheck}>
                  <Plus className="size-3.5" />
                </Button>
              </div>
            </section>

            <section className={SECTION}>
              <div className={cn(LABEL, 'inline-flex items-center gap-1.5')}>
                <Paperclip className="size-3" /> Lampiran
              </div>
              <ul className="space-y-1.5">
                {task.attachments.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-2 rounded-md bg-muted/40 px-2.5 py-2 text-[12px]"
                  >
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      className="min-w-0 flex-1 truncate text-primary hover:underline"
                    >
                      {a.name}
                    </a>
                    <button
                      type="button"
                      onClick={() =>
                        onChange({
                          attachments: task.attachments.filter((x) => x.id !== a.id),
                        })
                      }
                    >
                      <X className="size-3.5 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-2">
                <Input
                  value={attachName}
                  onChange={(e) => setAttachName(e.target.value)}
                  placeholder="Nama"
                  className="h-8"
                />
                <div className="flex gap-2">
                  <Input
                    value={attachUrl}
                    onChange={(e) => setAttachUrl(e.target.value)}
                    placeholder="https://…"
                    className="h-8"
                  />
                  <Button type="button" size="sm" variant="secondary" onClick={addAttach}>
                    <Plus className="size-3.5" />
                  </Button>
                </div>
              </div>
            </section>

            <section className={SECTION}>
              <div className={LABEL}>Catatan tertaut</div>
              {linked ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => onOpenPage(linked.id)}
                  >
                    <Link2 className="size-3.5" />
                    {linked.icon} {linked.title || 'Tanpa judul'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onChange({ pageId: null })}
                  >
                    Lepas
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {pages.slice(0, 8).map((p) => (
                    <Button
                      key={p.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7"
                      onClick={() => onChange({ pageId: p.id })}
                    >
                      {p.icon} {p.title || 'Tanpa judul'}
                    </Button>
                  ))}
                  {pages.length === 0 && (
                    <span className="text-[12px] text-muted-foreground">Belum ada catatan</span>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>

        <div className="shrink-0 border-t border-border/60 px-5 py-3">
          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => {
                onDelete()
                onClose()
              }}
            >
              <Trash2 className="size-3.5" /> Hapus
            </Button>
            {isDoneStatus(statuses, task.statusId) && (
              <span className="text-[11px] text-muted-foreground">Selesai</span>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className={LABEL}>{label}</span>
      {children}
    </div>
  )
}

function DetailMenu({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 w-full items-center justify-between gap-1.5 rounded-md border border-border bg-background px-2.5 text-left text-[13px] text-foreground hover:bg-muted/40"
        >
          <span className="min-w-0 truncate">{label}</span>
          <ChevronDown className="size-3.5 shrink-0 opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-44">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
