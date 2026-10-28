import { useMemo, useState } from 'react'
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Filter,
  LayoutList,
  Plus,
  Search,
  Share2,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  PRIORITY_META,
  createTask,
  dueState,
  isDoneStatus,
  openStatuses,
  todayISO,
} from '@/lib/tasks'
import type { Task, Workspace } from '@/types'
import { cn } from '@/lib/utils'
import {
  AssigneeCell,
  CU_GRID,
  CuPrimaryButton,
  PriorityCell,
  StatusChip,
  TaskCheck,
  ViewTabs,
  formatDueShort,
  statusLabel,
} from '@/components/taskUi'

type HomePane = 'list' | 'board'

type Props = {
  workspace: Workspace
  onOpenTask: (taskId: string) => void
  onOpenTasks: (listId?: string) => void
  onOpenNotes: () => void
  onPatch: (partial: Partial<Workspace>) => void
}

function dayKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function TaskRow({
  task,
  workspace,
  onOpen,
  onToggleDone,
}: {
  task: Task
  workspace: Workspace
  onOpen: () => void
  onToggleDone: () => void
}) {
  const done = isDoneStatus(workspace.taskStatuses, task.statusId)
  const ds = dueState(task.dueDate, done)
  const dueLabel = formatDueShort(task.dueDate)

  return (
    <div
      className={cn(
        CU_GRID,
        'group min-h-[38px] border-b border-border/40 px-3 transition-colors last:border-b-0 hover:bg-muted/40',
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5 py-2">
        <TaskCheck done={done} onToggle={onToggleDone} />
        <button
          type="button"
          className="min-w-0 flex-1 truncate text-left text-[13px] hover:underline"
          onClick={onOpen}
        >
          <span className={cn(done && 'text-muted-foreground line-through')}>
            {task.title || 'Tanpa judul'}
          </span>
        </button>
      </div>
      <div className="flex justify-start py-2">
        <AssigneeCell name={task.assignee} />
      </div>
      <div className="py-2">
        {dueLabel ? (
          <span
            className={cn(
              'text-[12px] tabular-nums',
              ds === 'overdue' && 'font-medium text-red-500',
              ds === 'today' && 'font-medium text-amber-500',
              ds !== 'overdue' && ds !== 'today' && 'text-muted-foreground',
            )}
          >
            {dueLabel}
          </span>
        ) : (
          <span className="text-[12px] text-muted-foreground/40">—</span>
        )}
      </div>
      <div className="py-2">
        <PriorityCell priority={task.priority} />
      </div>
    </div>
  )
}

export function HomeView({
  workspace,
  onOpenTask,
  onOpenTasks,
  onOpenNotes,
  onPatch,
}: Props) {
  const me = (workspace.displayName || 'Kamu').trim()
  const today = todayISO()
  const statuses = openStatuses(workspace.taskStatuses)
  const [pane, setPane] = useState<HomePane>('list')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [draftByStatus, setDraftByStatus] = useState<Record<string, string>>({})
  const [addingStatus, setAddingStatus] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const activeList =
    workspace.taskLists.find((l) => l.id === workspace.activeTaskListId) ??
    workspace.taskLists[0]
  const spaceName =
    workspace.taskSpaces.find((s) =>
      workspace.taskFolders.some(
        (f) => f.spaceId === s.id && f.id === activeList?.folderId,
      ),
    )?.name ?? 'Workspace'

  const roots = useMemo(() => {
    let list = workspace.tasks
      .filter((t) => !t.parentTaskId)
      .sort((a, b) => a.order - b.order)
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.assignee?.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q)),
      )
    }
    if (filterStatus !== 'all') {
      list = list.filter((t) => t.statusId === filterStatus)
    }
    return list
  }, [workspace.tasks, query, filterStatus])

  const openRoots = useMemo(
    () => roots.filter((t) => !isDoneStatus(workspace.taskStatuses, t.statusId)),
    [roots, workspace.taskStatuses],
  )

  const year = month.getFullYear()
  const mo = month.getMonth()
  const daysInMonth = new Date(year, mo + 1, 0).getDate()
  const startWeekday = new Date(year, mo, 1).getDay()
  const monthLabel = month.toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  })
  const cells: (number | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  function updateTask(id: string, partial: Partial<Task>) {
    onPatch({
      tasks: workspace.tasks.map((t) =>
        t.id === id
          ? {
              ...t,
              ...partial,
              updatedAt: Date.now(),
              completedAt:
                partial.statusId &&
                isDoneStatus(workspace.taskStatuses, partial.statusId)
                  ? Date.now()
                  : partial.statusId
                    ? null
                    : t.completedAt,
            }
          : t,
      ),
    })
  }

  function toggleDone(task: Task) {
    const done = isDoneStatus(workspace.taskStatuses, task.statusId)
    if (done) {
      const openId =
        statuses.find((s) => s.category === 'open')?.id ?? statuses[0]?.id
      if (openId) updateTask(task.id, { statusId: openId })
      return
    }
    const doneId =
      statuses.find((s) => s.category === 'done')?.id ??
      statuses.find((s) => s.category === 'closed')?.id
    if (doneId) updateTask(task.id, { statusId: doneId })
  }

  function addTask(statusId: string) {
    const title = (draftByStatus[statusId] ?? '').trim()
    if (!title) return
    const listId = workspace.activeTaskListId || workspace.taskLists[0]?.id
    if (!listId) return
    const task = createTask({
      listId,
      statusId,
      title,
      priority: 'normal',
      assignee: me,
    })
    onPatch({ tasks: [task, ...workspace.tasks] })
    setDraftByStatus((prev) => ({ ...prev, [statusId]: '' }))
    setAddingStatus(null)
  }

  function startQuickAdd() {
    const openId =
      statuses.find((s) => s.category === 'open')?.id ?? statuses[0]?.id
    if (!openId) return
    setPane('list')
    setCollapsed((prev) => ({ ...prev, [openId]: false }))
    setAddingStatus(openId)
  }

  const visibleStatuses =
    filterStatus === 'all' ? statuses : statuses.filter((s) => s.id === filterStatus)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative z-10 shrink-0 border-b border-border/50 bg-background px-4 pt-3 sm:px-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5 text-[13px]">
            <span className="truncate text-muted-foreground">{spaceName}</span>
            <span className="text-muted-foreground/50">/</span>
            <span className="truncate font-medium">
              {activeList?.icon ? `${activeList.icon} ` : ''}
              {activeList?.name ?? 'Beranda'}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={onOpenNotes}
            >
              Catatan
            </button>
            <button
              type="button"
              className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => onOpenTasks()}
            >
              <Share2 className="size-3.5" />
              Semua list
            </button>
            <CuPrimaryButton className="shrink-0" onClick={startQuickAdd}>
              <Plus className="size-3.5" strokeWidth={2.5} />
              Task
            </CuPrimaryButton>
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-2">
          <ViewTabs
            value={pane}
            onChange={setPane}
            options={[
              {
                id: 'board' as const,
                label: 'Board',
                icon: <Columns3 className="size-3.5 opacity-70" />,
              },
              {
                id: 'list' as const,
                label: 'List',
                icon: <LayoutList className="size-3.5 opacity-70" />,
              },
            ]}
          />
        </div>
      </div>

      <div className="relative z-10 flex shrink-0 items-center gap-2 border-b border-border/40 bg-background px-4 py-2 sm:px-5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border/60 bg-transparent px-2.5 text-[12px] text-foreground hover:bg-muted/50"
            >
              <Filter className="size-3 text-muted-foreground" />
              {filterStatus === 'all'
                ? 'Status'
                : statusLabel(
                    statuses.find((s) => s.id === filterStatus) ?? statuses[0]!,
                  )}
              <ChevronDown className="size-3 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-44">
            <DropdownMenuItem onClick={() => setFilterStatus('all')}>
              Semua status
              {filterStatus === 'all' && (
                <Check className="ml-auto size-3.5 opacity-70" />
              )}
            </DropdownMenuItem>
            {statuses.map((s) => (
              <DropdownMenuItem key={s.id} onClick={() => setFilterStatus(s.id)}>
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: s.color }}
                />
                {statusLabel(s)}
                {filterStatus === s.id && (
                  <Check className="ml-auto size-3.5 opacity-70" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="relative min-w-0 max-w-xs flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            className="h-7 w-full rounded-md border border-border/60 bg-transparent pr-2 pl-8 text-[12px] outline-none placeholder:text-muted-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
            placeholder="Cari tugas…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-3 py-3 sm:px-4">
        {/* Kalender selalu tampil di Beranda */}
        <section className="mb-4 rounded-lg border border-border/50 bg-card/20 p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[13px] font-semibold">
              <CalendarDays className="size-4 text-muted-foreground" />
              Kalender
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="flex size-7 items-center justify-center rounded-md hover:bg-muted"
                onClick={() =>
                  setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
                }
                aria-label="Bulan sebelumnya"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="min-w-[8.5rem] text-center text-[12px] font-medium capitalize">
                {monthLabel}
              </span>
              <button
                type="button"
                className="flex size-7 items-center justify-center rounded-md hover:bg-muted"
                onClick={() =>
                  setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
                }
                aria-label="Bulan berikutnya"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border">
            {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d) => (
              <div
                key={d}
                className="bg-muted/40 px-1 py-1.5 text-center text-[10px] font-medium text-muted-foreground"
              >
                {d}
              </div>
            ))}
            {cells.map((day, i) => {
              const iso = day != null ? dayKey(year, mo, day) : null
              const dayTasks = iso
                ? openRoots.filter((t) => t.dueDate === iso)
                : []
              const isToday = iso === today
              return (
                <div
                  key={iso ?? `e-${i}`}
                  className={cn(
                    'min-h-[3.75rem] bg-background p-1 sm:min-h-[4.25rem]',
                    isToday && 'bg-primary/10',
                  )}
                >
                  {day != null && (
                    <>
                      <div
                        className={cn(
                          'mb-0.5 text-[11px] tabular-nums text-muted-foreground',
                          isToday && 'font-semibold text-primary',
                        )}
                      >
                        {day}
                      </div>
                      <ul className="flex flex-col gap-0.5">
                        {dayTasks.slice(0, 3).map((t) => {
                          const ds = dueState(t.dueDate, false)
                          return (
                            <li key={t.id}>
                              <button
                                type="button"
                                className={cn(
                                  'flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[10px] hover:bg-muted',
                                  ds === 'overdue' && 'text-red-500',
                                  ds === 'today' && 'text-amber-500',
                                )}
                                onClick={() => onOpenTask(t.id)}
                                title={t.title}
                              >
                                <span
                                  className="size-1.5 shrink-0 rounded-full"
                                  style={{
                                    background:
                                      PRIORITY_META[t.priority].color || '#64748b',
                                  }}
                                />
                                <span className="truncate">{t.title || '—'}</span>
                              </button>
                            </li>
                          )
                        })}
                        {dayTasks.length > 3 && (
                          <li className="px-1 text-[9px] text-muted-foreground">
                            +{dayTasks.length - 3}
                          </li>
                        )}
                      </ul>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {pane === 'list' && (
          <div className="overflow-hidden rounded-lg border border-border/50 bg-card/20">
            <div
              className={cn(
                CU_GRID,
                'border-b border-border/50 px-3 py-2 text-[11px] font-medium text-muted-foreground',
              )}
            >
              <span className="pl-7">Name</span>
              <span>Assignee</span>
              <span>Due date</span>
              <span>Priority</span>
            </div>

            {visibleStatuses.map((status) => {
              const column = roots.filter((t) => t.statusId === status.id)
              const open = collapsed[status.id] !== true
              return (
                <section key={status.id} className="border-b border-border/30 last:border-b-0">
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <button
                      type="button"
                      className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-muted"
                      onClick={() =>
                        setCollapsed((prev) => ({
                          ...prev,
                          [status.id]: !(prev[status.id] === true),
                        }))
                      }
                      aria-label={open ? 'Ciutkan' : 'Bentangkan'}
                    >
                      <ChevronDown
                        className={cn(
                          'size-3.5 transition-transform',
                          !open && '-rotate-90',
                        )}
                      />
                    </button>
                    <StatusChip status={status} />
                    <span className="text-[12px] tabular-nums text-muted-foreground">
                      {column.length}
                    </span>
                  </div>

                  {open && (
                    <div>
                      {column.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          workspace={workspace}
                          onOpen={() => onOpenTask(task.id)}
                          onToggleDone={() => toggleDone(task)}
                        />
                      ))}

                      {addingStatus === status.id ? (
                        <div className="flex items-center gap-2 border-b border-border/30 px-3 py-1.5 pl-10">
                          <input
                            autoFocus
                            className="h-8 min-w-0 flex-1 rounded-md border border-primary/40 bg-background px-2.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                            placeholder="Task name"
                            value={draftByStatus[status.id] ?? ''}
                            onChange={(e) =>
                              setDraftByStatus((prev) => ({
                                ...prev,
                                [status.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') addTask(status.id)
                              if (e.key === 'Escape') setAddingStatus(null)
                            }}
                            onBlur={() => {
                              if ((draftByStatus[status.id] ?? '').trim()) {
                                addTask(status.id)
                              } else {
                                setAddingStatus(null)
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="flex h-9 w-full items-center gap-1.5 px-3 pl-10 text-[12px] text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                          onClick={() => setAddingStatus(status.id)}
                        >
                          <Plus className="size-3.5" /> Add Task
                        </button>
                      )}
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        )}

        {pane === 'board' && (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {visibleStatuses.map((status) => {
              const column = roots.filter((t) => t.statusId === status.id)
              return (
                <div
                  key={status.id}
                  className="flex w-64 shrink-0 flex-col rounded-lg border border-border/50 bg-card/20"
                >
                  <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2.5">
                    <StatusChip status={status} />
                    <span className="text-[12px] text-muted-foreground">{column.length}</span>
                  </div>
                  <ul className="flex flex-col gap-1.5 p-2">
                    {column.map((task) => {
                      const done = isDoneStatus(workspace.taskStatuses, task.statusId)
                      const ds = dueState(task.dueDate, done)
                      return (
                        <li key={task.id}>
                          <button
                            type="button"
                            className="w-full rounded-md border border-border/40 bg-background/60 px-2.5 py-2 text-left hover:border-primary/40 hover:bg-muted/40"
                            onClick={() => onOpenTask(task.id)}
                          >
                            <div
                              className={cn(
                                'mb-1.5 text-[13px] font-medium',
                                done && 'text-muted-foreground line-through',
                              )}
                            >
                              {task.title || 'Tanpa judul'}
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <AssigneeCell name={task.assignee} />
                              <span
                                className={cn(
                                  'text-[11px] tabular-nums',
                                  ds === 'overdue' && 'text-red-500',
                                  ds === 'today' && 'text-amber-500',
                                  ds !== 'overdue' &&
                                    ds !== 'today' &&
                                    'text-muted-foreground',
                                )}
                              >
                                {formatDueShort(task.dueDate) ?? ''}
                              </span>
                            </div>
                          </button>
                        </li>
                      )
                    })}
                    <li>
                      <button
                        type="button"
                        className="flex h-8 w-full items-center gap-1 rounded-md px-2 text-[12px] text-muted-foreground hover:bg-muted/40"
                        onClick={() => {
                          setPane('list')
                          setAddingStatus(status.id)
                        }}
                      >
                        <Plus className="size-3.5" /> Add Task
                      </button>
                    </li>
                  </ul>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
