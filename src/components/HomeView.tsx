import { useMemo } from 'react'
import {
  ArrowRight,
  CalendarDays,
  CheckSquare,
  FileText,
  History,
} from 'lucide-react'
import {
  dueState,
  formatTimeSpent,
  isDoneStatus,
  todayISO,
} from '@/lib/tasks'
import type { Workspace } from '@/types'
import { cn } from '@/lib/utils'
import { CuPrimaryButton, formatDueShort } from '@/components/taskUi'
import { Button } from '@/components/ui/button'

type Props = {
  workspace: Workspace
  onOpenTask: (taskId: string) => void
  onOpenTasks: (opts?: { listId?: string; due?: 'today' | 'overdue' | 'all' }) => void
  onOpenNotes: () => void
  onOpenPage: (pageId: string) => void
  onOpenActivity: () => void
}

export function HomeView({
  workspace,
  onOpenTask,
  onOpenTasks,
  onOpenNotes,
  onOpenPage,
  onOpenActivity,
}: Props) {
  const statuses = workspace.taskStatuses
  const openRoots = useMemo(
    () =>
      workspace.tasks.filter(
        (t) => !t.parentTaskId && !isDoneStatus(statuses, t.statusId),
      ),
    [workspace.tasks, statuses],
  )

  const overdue = openRoots.filter(
    (t) => dueState(t.dueDate, false) === 'overdue',
  )
  const today = openRoots.filter((t) => dueState(t.dueDate, false) === 'today')
  const undated = openRoots.filter((t) => !t.dueDate).slice(0, 5)

  const recentPages = useMemo(() => {
    const ids = workspace.recentPageIds ?? []
    const live = workspace.pages.filter((p) => !p.deletedAt)
    const byId = new Map(live.map((p) => [p.id, p]))
    const fromRecent = ids.map((id) => byId.get(id)).filter(Boolean)
    if (fromRecent.length) return fromRecent.slice(0, 6)
    return [...live]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 6)
  }, [workspace.pages, workspace.recentPageIds])

  const recentActivity = (workspace.activity ?? []).slice(0, 6)
  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 11) return 'Selamat pagi'
    if (h < 15) return 'Selamat siang'
    if (h < 18) return 'Selamat sore'
    return 'Selamat malam'
  })()
  const name = workspace.displayName?.trim() || 'kamu'
  const todayLabel = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-8">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {todayLabel}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {greeting}, {name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Ringkasan singkat — kerja mendalam ada di Tugas dan Catatan.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => onOpenTasks({ due: 'overdue' })}
          className={cn(
            'rounded-xl border border-border px-4 py-3 text-left transition-colors hover:bg-muted/50',
            overdue.length > 0 && 'border-destructive/40 bg-destructive/5',
          )}
        >
          <div className="text-2xl font-semibold tabular-nums">{overdue.length}</div>
          <div className="text-xs text-muted-foreground">Terlambat</div>
        </button>
        <button
          type="button"
          onClick={() => onOpenTasks({ due: 'today' })}
          className="rounded-xl border border-border px-4 py-3 text-left transition-colors hover:bg-muted/50"
        >
          <div className="text-2xl font-semibold tabular-nums">{today.length}</div>
          <div className="text-xs text-muted-foreground">Jatuh tempo hari ini</div>
        </button>
        <button
          type="button"
          onClick={() => onOpenTasks()}
          className="rounded-xl border border-border px-4 py-3 text-left transition-colors hover:bg-muted/50"
        >
          <div className="text-2xl font-semibold tabular-nums">{openRoots.length}</div>
          <div className="text-xs text-muted-foreground">Tugas terbuka</div>
        </button>
      </section>

      <section className="flex flex-wrap gap-2">
        <CuPrimaryButton onClick={() => onOpenTasks({ due: 'today' })}>
          <CalendarDays className="size-3.5" />
          Hari ini
        </CuPrimaryButton>
        <Button type="button" variant="secondary" size="sm" onClick={() => onOpenTasks()}>
          <CheckSquare className="size-3.5" />
          Buka Tugas
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onOpenNotes}>
          <FileText className="size-3.5" />
          Catatan
        </Button>
      </section>

      {(overdue.length > 0 || today.length > 0) && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Perlu perhatian</h2>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              onClick={() => onOpenTasks({ due: overdue.length ? 'overdue' : 'today' })}
            >
              Lihat di Tugas <ArrowRight className="size-3" />
            </button>
          </div>
          <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border">
            {[...overdue, ...today].slice(0, 8).map((task) => {
              const ds = dueState(task.dueDate, false)
              return (
                <li key={task.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/40"
                    onClick={() => onOpenTask(task.id)}
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {task.title || 'Tanpa judul'}
                    </span>
                    <span
                      className={cn(
                        'shrink-0 text-[11px] tabular-nums',
                        ds === 'overdue' && 'font-medium text-destructive',
                        ds === 'today' && 'font-medium text-amber-600 dark:text-amber-400',
                      )}
                    >
                      {formatDueShort(task.dueDate) || '—'}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {undated.length > 0 && overdue.length === 0 && today.length === 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Tanpa tanggal</h2>
          <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border">
            {undated.map((task) => (
              <li key={task.id}>
                <button
                  type="button"
                  className="flex w-full items-center px-3 py-2.5 text-left text-sm hover:bg-muted/40"
                  onClick={() => onOpenTask(task.id)}
                >
                  <span className="truncate">{task.title || 'Tanpa judul'}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Catatan terkini</h2>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            onClick={onOpenNotes}
          >
            Semua catatan <ArrowRight className="size-3" />
          </button>
        </div>
        {recentPages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada halaman.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {recentPages.map((page) =>
              page ? (
                <li key={page.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-left hover:bg-muted/40"
                    onClick={() => onOpenPage(page.id)}
                  >
                    <span className="text-base leading-none">{page.icon || '📄'}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {page.title || 'Tanpa judul'}
                    </span>
                  </button>
                </li>
              ) : null,
            )}
          </ul>
        )}
      </section>

      {recentActivity.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold inline-flex items-center gap-1.5">
              <History className="size-3.5 opacity-70" /> Aktivitas
            </h2>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              onClick={onOpenActivity}
            >
              Semua <ArrowRight className="size-3" />
            </button>
          </div>
          <ul className="space-y-1.5">
            {recentActivity.map((ev) => (
              <li
                key={ev.id}
                className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground"
              >
                <span className="min-w-0 truncate text-foreground/90">{ev.summary}</span>
                <span className="shrink-0 tabular-nums">
                  {new Date(ev.at).toLocaleString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-[11px] text-muted-foreground/80">
        {todayISO()}
        {openRoots.some((t) => t.timeSpentMinutes > 0)
          ? ` · Tercatat ${formatTimeSpent(
              openRoots.reduce((s, t) => s + (t.timeSpentMinutes || 0), 0),
            )} waktu kerja`
          : null}
      </p>
    </div>
  )
}
