import { useEffect, useMemo, useState, type DragEvent, type ReactNode } from 'react'
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  FileText,
  GanttChart,
  GripVertical,
  LayoutList,
  Link2,
  ListTree,
  PanelRight,
  Plus,
  Tag,
  Trash2,
  Unlink,
  User,
  X,
} from 'lucide-react'
import {
  CuPrimaryButton,
  StatusChip,
  TaskCheck,
  ViewTabs,
} from '@/components/taskUi'
import { DatePickerField } from '@/components/DateTimePickers'
import { GanttView } from '@/components/GanttView'
import { TaskDetailPanel } from '@/components/TaskDetailPanel'
import {
  PRIORITY_META,
  checklistProgress,
  collectTaskTreeIds,
  completeTaskWithRecur,
  createTask,
  dueState,
  filterAndSortTasks,
  isDoneStatus,
  knownAssignees,
  knownTags,
  moveTask,
  openStatuses,
  subtasksOf,
  tasksInList,
} from '@/lib/tasks'
import { askPrompt } from '@/lib/appDialog'
import {
  createTaskTemplate,
  deleteTaskTemplate,
  templateToPartial,
  upsertTaskTemplate,
} from '@/lib/taskTemplates'
import type {
  Page,
  Task,
  TaskDropMode,
  TaskDueFilter,
  TaskPriority,
  TaskSort,
  TaskStatus,
  TaskView,
  Workspace,
} from '@/types'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type Props = {
  workspace: Workspace
  pages: Page[]
  onPatch: (partial: Partial<Workspace>) => void
  onOpenPage: (pageId: string) => void
  focusTaskId?: string | null
  onFocusTaskConsumed?: () => void
  /** Dari Beranda / rail Hari ini — filter due lintas list */
  focusDueFilter?: TaskDueFilter | null
  onFocusDueConsumed?: () => void
}

const GRID = 'tasks-grid grid items-center gap-x-2'

const SELECT_CLS =
  'h-7 rounded-md border border-border bg-background px-2 text-[12px]'

const VIEW_LABEL: Record<TaskView, string> = {
  list: 'List',
  board: 'Board',
  calendar: 'Calendar',
  gantt: 'Gantt',
}

export function TasksView({
  workspace,
  pages,
  onPatch,
  onOpenPage,
  focusTaskId = null,
  onFocusTaskConsumed,
  focusDueFilter = null,
  onFocusDueConsumed,
}: Props) {
  const [draft, setDraft] = useState('')
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<{
    id: string
    mode: TaskDropMode
  } | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [detailId, setDetailId] = useState<string | null>(null)
  const [filterQuery, setFilterQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | string>('all')
  const [filterPriority, setFilterPriority] = useState<'all' | TaskPriority>('all')
  const [filterDue, setFilterDue] = useState<TaskDueFilter>('all')
  const [filterSort, setFilterSort] = useState<TaskSort>('order')
  const [filterAssignee, setFilterAssignee] = useState<'all' | string>('all')
  const [filterTag, setFilterTag] = useState<'all' | string>('all')
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [tplEditorOpen, setTplEditorOpen] = useState(false)
  const [statusCollapsed, setStatusCollapsed] = useState<Record<string, boolean>>({})
  const [tplDraft, setTplDraft] = useState({
    id: '',
    name: '',
    title: '',
    description: '',
    priority: 'normal' as TaskPriority,
    tags: '',
    checklist: '',
  })

  useEffect(() => {
    if (!focusTaskId) return
    const task = workspace.tasks.find((t) => t.id === focusTaskId)
    if (!task) {
      onFocusTaskConsumed?.()
      return
    }
    if (task.listId !== workspace.activeTaskListId) {
      onPatch({ activeTaskListId: task.listId })
    }
    if (task.parentTaskId) {
      setExpanded((prev) => ({ ...prev, [task.parentTaskId!]: true }))
    }
    setDetailId(focusTaskId)
    onFocusTaskConsumed?.()
  }, [focusTaskId])

  useEffect(() => {
    if (!focusDueFilter) return
    setFilterDue(focusDueFilter)
    onFocusDueConsumed?.()
  }, [focusDueFilter])

  const list =
    workspace.taskLists.find((l) => l.id === workspace.activeTaskListId) ??
    workspace.taskLists[0]
  const statuses = openStatuses(workspace.taskStatuses)
  /** Filter hari ini / overdue = lintas list (menggantikan mode Today). */
  const crossList = filterDue === 'today' || filterDue === 'overdue'
  const roots = useMemo(() => {
    const base = crossList
      ? workspace.tasks.filter((t) => !t.parentTaskId)
      : list
        ? tasksInList(workspace, list.id)
        : []
    return filterAndSortTasks(base, {
      statuses: workspace.taskStatuses,
      statusId: filterStatus,
      priority: filterPriority,
      due: filterDue,
      query: filterQuery,
      sort: filterSort,
      assignee: filterAssignee,
      tag: filterTag,
    })
  }, [
    workspace,
    list,
    crossList,
    filterStatus,
    filterPriority,
    filterDue,
    filterQuery,
    filterSort,
    filterAssignee,
    filterTag,
  ])
  const tags = useMemo(() => knownTags(workspace.tasks), [workspace.tasks])
  const assignees = useMemo(
    () => knownAssignees(workspace.tasks),
    [workspace.tasks],
  )
  const detailTask = detailId
    ? (workspace.tasks.find((t) => t.id === detailId) ?? null)
    : null

  const overdueCount = roots.filter(
    (t) => dueState(t.dueDate, isDoneStatus(statuses, t.statusId)) === 'overdue',
  ).length
  const todayCount = roots.filter(
    (t) => dueState(t.dueDate, isDoneStatus(statuses, t.statusId)) === 'today',
  ).length

  function updateTask(id: string, partial: Partial<Task>) {
    const task = workspace.tasks.find((t) => t.id === id)
    if (
      task &&
      partial.statusId &&
      isDoneStatus(workspace.taskStatuses, partial.statusId) &&
      task.recur !== 'none'
    ) {
      const openStatusId =
        statuses.find((s) => s.category === 'open')?.id ?? statuses[0]?.id
      if (openStatusId) {
        onPatch({
          tasks: completeTaskWithRecur(
            workspace.tasks,
            id,
            partial.statusId,
            openStatusId,
          ),
        })
        return
      }
    }
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

  function addTask(titleOverride?: string, statusId?: string, parentTaskId?: string | null) {
    const title = (titleOverride ?? draft).trim()
    if (!title || !list) return
    const sid =
      statusId ??
      statuses.find((s) => s.category === 'open')?.id ??
      statuses[0]?.id
    if (!sid) return
    const parent = parentTaskId
      ? workspace.tasks.find((t) => t.id === parentTaskId)
      : null
    const task = createTask({
      listId: parent?.listId ?? list.id,
      statusId: sid,
      title,
      priority: 'normal',
      parentTaskId: parentTaskId ?? null,
      pageId: parent?.pageId ?? null,
    })
    onPatch({ tasks: [task, ...workspace.tasks] })
    if (parentTaskId) {
      setExpanded((prev) => ({ ...prev, [parentTaskId]: true }))
    }
    if (!titleOverride) setDraft('')
  }

  function removeTask(id: string) {
    const tree = collectTaskTreeIds(workspace.tasks, id)
    onPatch({
      tasks: workspace.tasks.filter((t) => !tree.has(t.id)),
    })
    if (detailId && tree.has(detailId)) setDetailId(null)
  }

  function onDropStatus(statusId: string) {
    if (!dragId) return
    const task = workspace.tasks.find((t) => t.id === dragId)
    if (task && task.statusId !== statusId) {
      updateTask(dragId, { statusId })
    }
    setDragId(null)
    setDropTarget(null)
  }

  function onBoardCardDrop(targetId: string, statusId: string, e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!dragId || dragId === targetId) {
      setDragId(null)
      setDropTarget(null)
      return
    }
    const drag = workspace.tasks.find((t) => t.id === dragId)
    if (!drag) return
    let tasks = workspace.tasks
    if (drag.statusId !== statusId) {
      tasks = tasks.map((t) =>
        t.id === dragId
          ? {
              ...t,
              statusId,
              updatedAt: Date.now(),
              completedAt: isDoneStatus(workspace.taskStatuses, statusId)
                ? Date.now()
                : null,
            }
          : t,
      )
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const mode: TaskDropMode =
      e.clientY - rect.top < rect.height / 2 ? 'before' : 'after'
    onPatch({ tasks: moveTask(tasks, dragId, targetId, mode) })
    setDragId(null)
    setDropTarget(null)
  }

  function dropOnTask(targetId: string, mode: TaskDropMode) {
    if (!dragId || dragId === targetId) {
      setDragId(null)
      setDropTarget(null)
      return
    }
    onPatch({ tasks: moveTask(workspace.tasks, dragId, targetId, mode) })
    if (mode === 'into') {
      setExpanded((prev) => ({ ...prev, [targetId]: true }))
    }
    setDragId(null)
    setDropTarget(null)
  }

  function modeFromEvent(e: DragEvent<HTMLElement>): TaskDropMode {
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const ratio = y / rect.height
    if (ratio < 0.28) return 'before'
    if (ratio > 0.72) return 'after'
    return 'into'
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  function renderTree(task: Task, depth: number): ReactNode {
    const kids = subtasksOf(workspace, task.id)
    const open = expanded[task.id] ?? kids.length > 0
    return (
      <li key={task.id}>
        <TaskRow
          task={task}
          depth={depth}
          statuses={statuses}
          pages={pages}
          allTags={tags}
          childCount={kids.length}
          doneCount={kids.filter((k) => isDoneStatus(statuses, k.statusId)).length}
          expanded={open}
          dragging={dragId === task.id}
          dropMode={dropTarget?.id === task.id ? dropTarget.mode : null}
          onToggleExpand={() => toggleExpand(task.id)}
          onChange={(partial) => updateTask(task.id, partial)}
          onAddSubtask={() => addTask('Sub-tugas baru', undefined, task.id)}
          onDelete={() => removeTask(task.id)}
          onOpenPage={onOpenPage}
          onOpenDetail={() => setDetailId(task.id)}
          onDragStart={() => setDragId(task.id)}
          onDragEnd={() => {
            setDragId(null)
            setDropTarget(null)
          }}
          onDragOver={(e) => {
            e.preventDefault()
            if (!dragId || dragId === task.id) return
            const mode = modeFromEvent(e)
            setDropTarget((prev) =>
              prev?.id === task.id && prev.mode === mode ? prev : { id: task.id, mode },
            )
          }}
          onDrop={(e) => {
            e.preventDefault()
            dropOnTask(task.id, modeFromEvent(e))
          }}
        />
        {open && kids.length > 0 && (
          <ul>{kids.map((child) => renderTree(child, depth + 1))}</ul>
        )}
      </li>
    )
  }

  const spaceName =
    workspace.taskSpaces.find((s) =>
      workspace.taskFolders.some(
        (f) => f.spaceId === s.id && f.id === list?.folderId,
      ),
    )?.name ?? 'Workspace'

  return (
    <div className="tasks-view flex h-full min-h-0 w-full flex-col">
      <div className="relative z-10 shrink-0 border-b border-border/50 bg-background px-4 pt-3 sm:px-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5 text-[13px]">
            {crossList ? (
              <>
                <span className="truncate text-muted-foreground">Semua list</span>
                <span className="text-muted-foreground/50">/</span>
                <span className="truncate font-medium">
                  {filterDue === 'overdue' ? 'Terlambat' : 'Hari ini'}
                </span>
                <button
                  type="button"
                  className="ml-1 text-[11px] text-primary hover:underline"
                  onClick={() => setFilterDue('all')}
                >
                  Kembali ke list
                </button>
              </>
            ) : (
              <>
                <span className="truncate text-muted-foreground">{spaceName}</span>
                <span className="text-muted-foreground/50">/</span>
                <span className="truncate font-medium">
                  {list?.icon ? `${list.icon} ` : ''}
                  {list?.name ?? 'Tugas'}
                </span>
              </>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            {(overdueCount > 0 || todayCount > 0) && (
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                {overdueCount > 0 && (
                  <button
                    type="button"
                    className={cn(
                      'rounded-md border border-destructive/40 bg-destructive/10 px-2 py-0.5 font-medium text-destructive',
                      filterDue === 'overdue' && 'ring-1 ring-destructive/50',
                    )}
                    onClick={() =>
                      setFilterDue((d) => (d === 'overdue' ? 'all' : 'overdue'))
                    }
                  >
                    {overdueCount} overdue
                  </button>
                )}
                {todayCount > 0 && (
                  <button
                    type="button"
                    className={cn(
                      'rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-medium text-amber-600 dark:text-amber-400',
                      filterDue === 'today' && 'ring-1 ring-amber-500/50',
                    )}
                    onClick={() =>
                      setFilterDue((d) => (d === 'today' ? 'all' : 'today'))
                    }
                  >
                    {todayCount} today
                  </button>
                )}
              </div>
            )}
            <CuPrimaryButton className="shrink-0" onClick={() => addTask()}>
              <Plus className="size-3.5" strokeWidth={2.5} />
              Task
            </CuPrimaryButton>
          </div>
        </div>
        <ViewTabs
          value={workspace.taskView}
          onChange={(v) => onPatch({ taskView: v })}
          options={[
            {
              id: 'board' as TaskView,
              label: VIEW_LABEL.board,
              icon: <Columns3 className="size-3.5 opacity-70" />,
            },
            {
              id: 'list' as TaskView,
              label: VIEW_LABEL.list,
              icon: <LayoutList className="size-3.5 opacity-70" />,
            },
            {
              id: 'calendar' as TaskView,
              label: VIEW_LABEL.calendar,
              icon: <CalendarDays className="size-3.5 opacity-70" />,
            },
            {
              id: 'gantt' as TaskView,
              label: VIEW_LABEL.gantt,
              icon: <GanttChart className="size-3.5 opacity-70" />,
            },
          ]}
        />
      </div>

      <div className="relative z-10 flex shrink-0 items-center gap-2 border-b border-border/40 bg-background px-4 py-2 sm:px-5">
        <Plus className="size-3.5 shrink-0 text-muted-foreground" />
        <input
          className="h-7 min-w-0 flex-1 border-0 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground sm:max-w-md"
          placeholder="Task name…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addTask()
          }}
        />
        {(workspace.taskTemplates?.length ?? 0) > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  SELECT_CLS,
                  'inline-flex shrink-0 items-center gap-1 text-muted-foreground hover:text-foreground',
                )}
                aria-label="Template tugas"
              >
                Template
                <ChevronDown className="size-3.5 opacity-70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-48">
              {workspace.taskTemplates.map((tpl) => (
                <DropdownMenuItem
                  key={tpl.id}
                  onClick={() => {
                    const partial = templateToPartial(tpl)
                    const listId = workspace.activeTaskListId || workspace.taskLists[0]?.id
                    const statusId =
                      workspace.taskStatuses.find((s) => s.category === 'open')?.id ??
                      workspace.taskStatuses[0]?.id
                    if (!listId || !statusId) return
                    const task = createTask({ listId, statusId, ...partial })
                    onPatch({ tasks: [task, ...workspace.tasks] })
                  }}
                >
                  <span className="flex flex-col gap-0.5">
                    <span>{tpl.name}</span>
                    {tpl.tags.length > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        {tpl.tags.join(' · ')}
                      </span>
                    )}
                  </span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setTplDraft({
                    id: '',
                    name: '',
                    title: '',
                    description: '',
                    priority: 'normal',
                    tags: '',
                    checklist: '',
                  })
                  setTplEditorOpen(true)
                }}
              >
                Kelola template…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {!(workspace.taskTemplates?.length > 0) && (
          <button
            type="button"
            className={cn(SELECT_CLS, 'text-muted-foreground hover:text-foreground')}
            onClick={() => {
              setTplDraft({
                id: '',
                name: '',
                title: '',
                description: '',
                priority: 'normal',
                tags: '',
                checklist: '',
              })
              setTplEditorOpen(true)
            }}
          >
            + Template
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-4 py-3 sm:px-5">
      <div className="tasks-filters mb-3">
        <input
          className={cn(SELECT_CLS, 'min-w-[8rem] flex-1 basis-full sm:basis-auto')}
          placeholder="Cari tugas…"
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          aria-label="Cari"
        />
        <FilterMenu
          label={
            filterStatus === 'all'
              ? 'Status: semua'
              : statuses.find((s) => s.id === filterStatus)?.name ?? 'Status'
          }
          ariaLabel="Status"
        >
          <DropdownMenuItem onClick={() => setFilterStatus('all')}>
            Status: semua
            {filterStatus === 'all' && <Check className="ml-auto size-3.5 opacity-70" />}
          </DropdownMenuItem>
          {statuses.map((s) => (
            <DropdownMenuItem key={s.id} onClick={() => setFilterStatus(s.id)}>
              <span className="size-2 shrink-0 rounded-full" style={{ background: s.color }} />
              {s.name}
              {filterStatus === s.id && <Check className="ml-auto size-3.5 opacity-70" />}
            </DropdownMenuItem>
          ))}
        </FilterMenu>
        <FilterMenu
          label={
            filterPriority === 'all'
              ? 'Prioritas: semua'
              : PRIORITY_META[filterPriority].label
          }
          ariaLabel="Prioritas"
        >
          <DropdownMenuItem onClick={() => setFilterPriority('all')}>
            Prioritas: semua
            {filterPriority === 'all' && <Check className="ml-auto size-3.5 opacity-70" />}
          </DropdownMenuItem>
          {(Object.keys(PRIORITY_META) as TaskPriority[]).map((p) => (
            <DropdownMenuItem key={p} onClick={() => setFilterPriority(p)}>
              <span
                className="size-2 shrink-0 rounded-full"
                style={{
                  background: p === 'none' ? 'var(--muted-foreground)' : PRIORITY_META[p].color,
                }}
              />
              {PRIORITY_META[p].label}
              {filterPriority === p && <Check className="ml-auto size-3.5 opacity-70" />}
            </DropdownMenuItem>
          ))}
        </FilterMenu>
        <FilterMenu
          label={
            (
              {
                all: 'Due: semua',
                today: 'Hari ini',
                overdue: 'Overdue',
                upcoming: 'Upcoming',
                none: 'Tanpa due',
              } as Record<TaskDueFilter, string>
            )[filterDue]
          }
          ariaLabel="Due"
        >
          {(
            [
              ['all', 'Due: semua'],
              ['today', 'Hari ini'],
              ['overdue', 'Overdue'],
              ['upcoming', 'Upcoming'],
              ['none', 'Tanpa due'],
            ] as Array<[TaskDueFilter, string]>
          ).map(([value, text]) => (
            <DropdownMenuItem key={value} onClick={() => setFilterDue(value)}>
              {text}
              {filterDue === value && <Check className="ml-auto size-3.5 opacity-70" />}
            </DropdownMenuItem>
          ))}
        </FilterMenu>
        <FilterMenu
          label={
            filterAssignee === 'all'
              ? 'Assignee: semua'
              : filterAssignee === '__none__'
                ? 'Tanpa assignee'
                : filterAssignee
          }
          ariaLabel="Assignee"
        >
          <DropdownMenuItem onClick={() => setFilterAssignee('all')}>
            Assignee: semua
            {filterAssignee === 'all' && <Check className="ml-auto size-3.5 opacity-70" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setFilterAssignee('__none__')}>
            Tanpa assignee
            {filterAssignee === '__none__' && (
              <Check className="ml-auto size-3.5 opacity-70" />
            )}
          </DropdownMenuItem>
          {assignees.map((a) => (
            <DropdownMenuItem key={a} onClick={() => setFilterAssignee(a)}>
              {a}
              {filterAssignee === a && <Check className="ml-auto size-3.5 opacity-70" />}
            </DropdownMenuItem>
          ))}
        </FilterMenu>
        <FilterMenu
          label={filterTag === 'all' ? 'Tag: semua' : `#${filterTag}`}
          ariaLabel="Tag"
        >
          <DropdownMenuItem onClick={() => setFilterTag('all')}>
            Tag: semua
            {filterTag === 'all' && <Check className="ml-auto size-3.5 opacity-70" />}
          </DropdownMenuItem>
          {tags.map((tag) => (
            <DropdownMenuItem key={tag} onClick={() => setFilterTag(tag)}>
              #{tag}
              {filterTag === tag && <Check className="ml-auto size-3.5 opacity-70" />}
            </DropdownMenuItem>
          ))}
        </FilterMenu>
        <FilterMenu
          label={
            (
              {
                order: 'Urutan',
                due: 'Due',
                priority: 'Prioritas',
                title: 'Judul',
              } as Record<TaskSort, string>
            )[filterSort]
          }
          ariaLabel="Sort"
        >
          {(
            [
              ['order', 'Urutan'],
              ['due', 'Due'],
              ['priority', 'Prioritas'],
              ['title', 'Judul'],
            ] as Array<[TaskSort, string]>
          ).map(([value, text]) => (
            <DropdownMenuItem key={value} onClick={() => setFilterSort(value)}>
              {text}
              {filterSort === value && <Check className="ml-auto size-3.5 opacity-70" />}
            </DropdownMenuItem>
          ))}
        </FilterMenu>
      </div>

      {workspace.taskView === 'list' && (
        <div className="overflow-hidden rounded-lg border border-border/50 bg-card/20">
          <div
            className={cn(
              GRID,
              'border-b border-border/50 px-2 py-2 text-[11px] font-medium text-muted-foreground',
            )}
          >
            <span className="pl-10">Name</span>
            <span className="tasks-col-assignee">Assignee</span>
            <span>Due date</span>
            <span className="tasks-col-priority">Priority</span>
            <span />
          </div>
          {roots.length === 0 && (
            <p className="py-12 text-center text-[13px] text-muted-foreground">
              Belum ada tugas di list ini.
            </p>
          )}
          {statuses.map((status) => {
            const column = roots.filter((t) => t.statusId === status.id)
            if (filterStatus !== 'all' && filterStatus !== status.id) return null
            const open = statusCollapsed[status.id] !== true
            return (
              <section
                key={status.id}
                className="border-b border-border/30 last:border-b-0"
              >
                <div className="flex items-center gap-2 px-2 py-2.5">
                  <button
                    type="button"
                    className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-muted"
                    onClick={() =>
                      setStatusCollapsed((prev) => ({
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
                  <>
                    <ul>{column.map((task) => renderTree(task, 0))}</ul>
                    <button
                      type="button"
                      className="flex h-9 w-full items-center gap-1.5 px-3 pl-10 text-[12px] text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                      onClick={() => {
                        const listId =
                          workspace.activeTaskListId || workspace.taskLists[0]?.id
                        if (!listId) return
                        const task = createTask({
                          listId,
                          statusId: status.id,
                          title: '',
                          priority: 'normal',
                        })
                        onPatch({ tasks: [task, ...workspace.tasks] })
                        setDetailId(task.id)
                      }}
                    >
                      <Plus className="size-3.5" /> Add Task
                    </button>
                  </>
                )}
              </section>
            )
          })}
        </div>
      )}

      {workspace.taskView === 'board' && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {statuses.map((status) => {
            const column = roots.filter((t) => t.statusId === status.id)
            return (
              <div
                key={status.id}
                className="flex w-64 shrink-0 flex-col rounded-lg border border-border/50 bg-card/20"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDropStatus(status.id)}
              >
                <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2.5">
                  <StatusChip status={status} />
                  <span className="text-[12px] tabular-nums text-muted-foreground">
                    {column.length}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-1.5 px-1.5 pb-2">
                  {column.map((task) => {
                    const kids = subtasksOf(workspace, task.id)
                    const page = task.pageId
                      ? pages.find((p) => p.id === task.pageId)
                      : null
                    const progress = checklistProgress(task)
                    const ds = dueState(
                      task.dueDate,
                      isDoneStatus(statuses, task.statusId),
                    )
                    return (
                      <div
                        key={task.id}
                        className={cn(
                          'cursor-grab rounded-md border border-border/50 bg-background px-2.5 py-2 active:cursor-grabbing',
                          dropTarget?.id === task.id &&
                            dropTarget.mode === 'before' &&
                            'border-t-2 border-t-primary',
                          dropTarget?.id === task.id &&
                            dropTarget.mode === 'after' &&
                            'border-b-2 border-b-primary',
                          dragId === task.id && 'opacity-40',
                        )}
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation()
                          setDragId(task.id)
                        }}
                        onDragEnd={() => {
                          setDragId(null)
                          setDropTarget(null)
                        }}
                        onDragOver={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          if (!dragId || dragId === task.id) return
                          const rect = e.currentTarget.getBoundingClientRect()
                          const mode: TaskDropMode =
                            e.clientY - rect.top < rect.height / 2 ? 'before' : 'after'
                          setDropTarget((prev) =>
                            prev?.id === task.id && prev.mode === mode
                              ? prev
                              : { id: task.id, mode },
                          )
                        }}
                        onDrop={(e) => onBoardCardDrop(task.id, status.id, e)}
                        onClick={() => setDetailId(task.id)}
                      >
                        <div className="text-[13px] font-medium leading-snug">
                          {task.title}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
                          {task.assignee && (
                            <span className="inline-flex items-center gap-0.5">
                              <User className="size-2.5" />
                              {task.assignee}
                            </span>
                          )}
                          <span
                            style={{
                              color: PRIORITY_META[task.priority].color || undefined,
                            }}
                          >
                            {PRIORITY_META[task.priority].label}
                          </span>
                          {task.dueDate && (
                            <span
                              className={cn(
                                ds === 'overdue' && 'text-destructive',
                                ds === 'today' && 'text-amber-600 dark:text-amber-400',
                              )}
                            >
                              {task.dueDate}
                            </span>
                          )}
                          {progress.total > 0 && (
                            <span className="tabular-nums">
                              {progress.done}/{progress.total}
                            </span>
                          )}
                          {task.tags.map((tag) => (
                            <span key={tag} className="rounded bg-muted px-1">
                              {tag}
                            </span>
                          ))}
                          {kids.length > 0 && (
                            <span className="inline-flex items-center gap-0.5">
                              <ListTree className="size-2.5" />
                              {kids.filter((k) => isDoneStatus(statuses, k.statusId)).length}/
                              {kids.length}
                            </span>
                          )}
                          {page && (
                            <button
                              type="button"
                              className="inline-flex items-center gap-0.5 hover:text-foreground"
                              onClick={(e) => {
                                e.stopPropagation()
                                onOpenPage(page.id)
                              }}
                            >
                              <FileText className="size-2.5" />
                              {page.title || 'Catatan'}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  <button
                    type="button"
                    className="flex h-7 items-center gap-1 rounded-md px-2 text-[12px] text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    onClick={() => addTask('Tugas baru', status.id)}
                  >
                    <Plus className="size-3.5" /> Tambah
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {workspace.taskView === 'calendar' && (
        <CalendarMonth
          month={calendarMonth}
          tasks={roots}
          undated={roots.filter((t) => !t.dueDate)}
          statuses={statuses}
          onPrev={() =>
            setCalendarMonth(
              (m) => new Date(m.getFullYear(), m.getMonth() - 1, 1),
            )
          }
          onNext={() =>
            setCalendarMonth(
              (m) => new Date(m.getFullYear(), m.getMonth() + 1, 1),
            )
          }
          onOpenDetail={setDetailId}
          onSetDue={(taskId, dueDate) => updateTask(taskId, { dueDate })}
        />
      )}

      {workspace.taskView === 'gantt' && (
        <GanttView
          tasks={roots}
          statuses={statuses}
          onOpenTask={setDetailId}
          onPatchTask={(id, partial) => updateTask(id, partial)}
        />
      )}

      {tplEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-md overflow-auto rounded-xl border border-border bg-background p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-[15px] font-semibold">
                {tplDraft.id ? 'Edit template' : 'Template tugas'}
              </h3>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-[12px] text-muted-foreground hover:bg-muted"
                onClick={() => setTplEditorOpen(false)}
              >
                Tutup
              </button>
            </div>
            <ul className="mb-3 space-y-1">
              {workspace.taskTemplates.map((tpl) => (
                <li
                  key={tpl.id}
                  className="flex items-center gap-2 rounded-md border border-border/60 px-2 py-1.5 text-[13px]"
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-left hover:underline"
                    onClick={() =>
                      setTplDraft({
                        id: tpl.id,
                        name: tpl.name,
                        title: tpl.title,
                        description: tpl.description,
                        priority: tpl.priority,
                        tags: tpl.tags.join(', '),
                        checklist: tpl.checklist.map((c) => c.text).join('\n'),
                      })
                    }
                  >
                    {tpl.name}
                  </button>
                  <button
                    type="button"
                    className="text-[11px] text-destructive hover:underline"
                    onClick={() =>
                      onPatch({
                        taskTemplates: deleteTaskTemplate(
                          workspace.taskTemplates,
                          tpl.id,
                        ),
                      })
                    }
                  >
                    Hapus
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-2">
              <input
                className={SELECT_CLS}
                placeholder="Nama template"
                value={tplDraft.name}
                onChange={(e) => setTplDraft((d) => ({ ...d, name: e.target.value }))}
              />
              <input
                className={SELECT_CLS}
                placeholder="Judul tugas"
                value={tplDraft.title}
                onChange={(e) => setTplDraft((d) => ({ ...d, title: e.target.value }))}
              />
              <textarea
                className={cn(SELECT_CLS, 'h-16 resize-none py-1.5')}
                placeholder="Deskripsi"
                value={tplDraft.description}
                onChange={(e) =>
                  setTplDraft((d) => ({ ...d, description: e.target.value }))
                }
              />
              <select
                className={SELECT_CLS}
                value={tplDraft.priority}
                onChange={(e) =>
                  setTplDraft((d) => ({
                    ...d,
                    priority: e.target.value as TaskPriority,
                  }))
                }
              >
                {(Object.keys(PRIORITY_META) as TaskPriority[]).map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_META[p].label}
                  </option>
                ))}
              </select>
              <input
                className={SELECT_CLS}
                placeholder="Tags (pisah koma)"
                value={tplDraft.tags}
                onChange={(e) => setTplDraft((d) => ({ ...d, tags: e.target.value }))}
              />
              <textarea
                className={cn(SELECT_CLS, 'h-20 resize-none py-1.5')}
                placeholder="Checklist (satu baris per item)"
                value={tplDraft.checklist}
                onChange={(e) =>
                  setTplDraft((d) => ({ ...d, checklist: e.target.value }))
                }
              />
              <button
                type="button"
                className="h-8 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground"
                onClick={() => {
                  if (!tplDraft.name.trim()) return
                  const tpl = createTaskTemplate({
                    id: tplDraft.id || undefined,
                    name: tplDraft.name,
                    title: tplDraft.title,
                    description: tplDraft.description,
                    priority: tplDraft.priority,
                    tags: tplDraft.tags
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean),
                    checklist: tplDraft.checklist
                      .split('\n')
                      .map((t) => t.trim())
                      .filter(Boolean)
                      .map((text) => ({ id: '', text, checked: false })),
                  })
                  onPatch({
                    taskTemplates: upsertTaskTemplate(workspace.taskTemplates, tpl),
                  })
                  setTplDraft({
                    id: '',
                    name: '',
                    title: '',
                    description: '',
                    priority: 'normal',
                    tags: '',
                    checklist: '',
                  })
                }}
              >
                {tplDraft.id ? 'Simpan perubahan' : 'Tambah template'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      <TaskDetailPanel
        task={detailTask}
        statuses={statuses}
        pages={pages}
        knownTags={tags}
        open={detailId !== null && detailTask !== null}
        onClose={() => setDetailId(null)}
        onChange={(partial) => {
          if (detailId) updateTask(detailId, partial)
        }}
        onDelete={() => {
          if (detailId) removeTask(detailId)
        }}
        onOpenPage={onOpenPage}
      />
    </div>
  )
}

function CalendarMonth({
  month,
  tasks,
  undated,
  statuses,
  onPrev,
  onNext,
  onOpenDetail,
  onSetDue,
}: {
  month: Date
  tasks: Task[]
  undated: Task[]
  statuses: TaskStatus[]
  onPrev: () => void
  onNext: () => void
  onOpenDetail: (id: string) => void
  onSetDue: (taskId: string, dueDate: string | null) => void
}) {
  const year = month.getFullYear()
  const mo = month.getMonth()
  const daysInMonth = new Date(year, mo + 1, 0).getDate()
  const startWeekday = new Date(year, mo, 1).getDay()
  const label = month.toLocaleDateString('id', { month: 'long', year: 'numeric' })
  const cells: (number | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  function dayKey(day: number) {
    return `${year}-${String(mo + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          className="flex size-8 items-center justify-center rounded-md hover:bg-muted"
          onClick={onPrev}
          aria-label="Bulan sebelumnya"
        >
          <ChevronLeft className="size-4" />
        </button>
        <h2 className="text-[14px] font-semibold capitalize">{label}</h2>
        <button
          type="button"
          className="flex size-8 items-center justify-center rounded-md hover:bg-muted"
          onClick={onNext}
          aria-label="Bulan berikutnya"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <p className="mb-3 text-[12px] leading-relaxed text-muted-foreground">
        Klik chip untuk buka detail · seret antar tanggal untuk ubah due.
      </p>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border">
        {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d) => (
          <div
            key={d}
            className="bg-muted/40 px-1.5 py-1.5 text-center text-[10px] font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          const key = day ? dayKey(day) : `e-${i}`
          const iso = day ? dayKey(day) : null
          const dayTasks = iso ? tasks.filter((t) => t.dueDate === iso) : []
          return (
            <div
              key={key}
              className="min-h-20 bg-background p-1.5"
              onDragOver={(e) => {
                if (iso) e.preventDefault()
              }}
              onDrop={(e) => {
                e.preventDefault()
                const id = e.dataTransfer.getData('text/task-id')
                if (id && iso) onSetDue(id, iso)
              }}
            >
              {day != null && (
                <>
                  <div className="mb-1 text-[11px] tabular-nums text-muted-foreground">
                    {day}
                  </div>
                  <ul className="flex flex-col gap-0.5">
                    {dayTasks.map((t) => {
                      const ds = dueState(
                        t.dueDate,
                        isDoneStatus(statuses, t.statusId),
                      )
                      const status = statuses.find((s) => s.id === t.statusId)
                      return (
                        <li key={t.id}>
                          <button
                            type="button"
                            draggable
                            title={[
                              t.title,
                              t.dueTime,
                              t.assignee,
                              t.description?.slice(0, 80),
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                            className={cn(
                              'flex w-full cursor-grab flex-col gap-0.5 rounded-md border border-border/40 bg-muted/30 px-1.5 py-1 text-left hover:bg-muted active:cursor-grabbing',
                              ds === 'overdue' && 'border-destructive/40 bg-destructive/10',
                              ds === 'today' && 'border-amber-500/40 bg-amber-500/10',
                            )}
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/task-id', t.id)
                              e.dataTransfer.effectAllowed = 'move'
                            }}
                            onClick={() => onOpenDetail(t.id)}
                          >
                            <span className="flex min-w-0 items-center gap-1">
                              <span
                                className="size-1.5 shrink-0 rounded-full"
                                style={{
                                  background:
                                    PRIORITY_META[t.priority].color ||
                                    status?.color ||
                                    '#64748b',
                                }}
                              />
                              <span
                                className={cn(
                                  'min-w-0 flex-1 truncate text-[10px] font-medium leading-tight',
                                  ds === 'overdue' && 'text-destructive',
                                  ds === 'today' &&
                                    'text-amber-700 dark:text-amber-400',
                                )}
                              >
                                {t.title || 'Tanpa judul'}
                              </span>
                            </span>
                            {(t.dueTime || t.assignee) && (
                              <span className="truncate pl-2.5 text-[9px] tabular-nums text-muted-foreground">
                                {[t.dueTime, t.assignee].filter(Boolean).join(' · ')}
                              </span>
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </>
              )}
            </div>
          )
        })}
      </div>
      {undated.length > 0 && (
        <div
          className="mt-3 rounded-lg border border-dashed border-border/70 p-2"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const id = e.dataTransfer.getData('text/task-id')
            if (id) onSetDue(id, null)
          }}
        >
          <div className="mb-1.5 text-[11px] font-medium text-muted-foreground">
            Tanpa due — seret ke sini untuk hapus tanggal
          </div>
          <ul className="flex flex-wrap gap-1.5">
            {undated.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  draggable
                  className="cursor-grab rounded-md bg-muted/50 px-2 py-1 text-[11px] hover:bg-muted active:cursor-grabbing"
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/task-id', t.id)
                  }}
                  onClick={() => onOpenDetail(t.id)}
                >
                  {t.title || 'Tanpa judul'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function TaskRow({
  task,
  depth,
  statuses,
  pages,
  allTags,
  childCount,
  doneCount,
  expanded,
  dragging,
  dropMode,
  onToggleExpand,
  onChange,
  onAddSubtask,
  onDelete,
  onOpenPage,
  onOpenDetail,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: {
  task: Task
  depth: number
  statuses: TaskStatus[]
  pages: Page[]
  allTags: string[]
  childCount: number
  doneCount: number
  expanded: boolean
  dragging: boolean
  dropMode: TaskDropMode | null
  onToggleExpand: () => void
  onChange: (partial: Partial<Task>) => void
  onAddSubtask: () => void
  onDelete: () => void
  onOpenPage: (pageId: string) => void
  onOpenDetail: () => void
  onDragStart: () => void
  onDragEnd: () => void
  onDragOver: (e: DragEvent<HTMLElement>) => void
  onDrop: (e: DragEvent<HTMLElement>) => void
}) {
  const done = isDoneStatus(statuses, task.statusId)
  const linked = task.pageId ? pages.find((p) => p.id === task.pageId) : null
  const [tagDraft, setTagDraft] = useState('')
  const progress = checklistProgress(task)
  const ds = dueState(task.dueDate, done)

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase()
    if (!tag || task.tags.includes(tag)) return
    onChange({ tags: [...task.tags, tag] })
    setTagDraft('')
  }

  function removeTag(tag: string) {
    onChange({ tags: task.tags.filter((t) => t !== tag) })
  }

  return (
    <div
      className={cn(
        'group relative border-b border-border/50 hover:bg-muted/10',
        done && 'opacity-45',
        dragging && 'opacity-40',
        dropMode === 'into' && 'bg-primary/10 ring-1 ring-inset ring-primary/40',
      )}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {dropMode === 'before' && (
        <span className="pointer-events-none absolute inset-x-1 top-0 h-0.5 bg-primary" />
      )}
      {dropMode === 'after' && (
        <span className="pointer-events-none absolute inset-x-1 bottom-0 h-0.5 bg-primary" />
      )}

      <div className={cn(GRID, 'min-h-9 px-1')}>
        <div
          className="flex min-w-0 items-center gap-1 overflow-hidden"
          style={{ paddingLeft: `${depth}rem` }}
        >
          <button
            type="button"
            className="flex size-6 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-foreground active:cursor-grabbing focus-visible:opacity-100"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = 'move'
              onDragStart()
            }}
            onDragEnd={onDragEnd}
            aria-label="Seret tugas"
          >
            <GripVertical className="size-3.5" />
          </button>
          <button
            type="button"
            className={cn(
              'flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground',
              childCount === 0 && 'invisible',
            )}
            onClick={onToggleExpand}
            aria-label={expanded ? 'Tutup grup' : 'Buka grup'}
          >
            {expanded ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )}
          </button>
          <TaskCheck
            done={done}
            onToggle={() => {
              if (done) {
                const openId =
                  statuses.find((s) => s.category === 'open')?.id ?? statuses[0]?.id
                if (openId) onChange({ statusId: openId })
              } else {
                const doneId =
                  statuses.find((s) => s.category === 'done')?.id ??
                  statuses.find((s) => s.category === 'closed')?.id
                if (doneId) onChange({ statusId: doneId })
              }
            }}
          />
          <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden">
            <input
              value={task.title}
              onChange={(e) => onChange({ title: e.target.value })}
              onDoubleClick={onOpenDetail}
              className={cn(
                'task-cell h-8 min-w-0 flex-1 truncate text-[13px]',
                done && 'line-through',
              )}
              placeholder="Tanpa judul"
            />
            {task.tags.map((tag) => (
              <button
                key={tag}
                type="button"
                className="inline-flex h-5 max-w-[4.5rem] shrink-0 items-center gap-0.5 truncate rounded bg-muted/70 px-1.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
                title="Hapus tag"
                onClick={() => removeTag(tag)}
              >
                <span className="truncate">{tag}</span>
                <X className="size-2.5 shrink-0 opacity-50" />
              </button>
            ))}
            <input
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault()
                  addTag(tagDraft.replace(/,/g, ''))
                }
                if (e.key === 'Escape') {
                  setTagDraft('')
                  ;(e.target as HTMLInputElement).blur()
                }
              }}
              onBlur={() => {
                if (tagDraft.trim()) addTag(tagDraft)
              }}
              spellCheck={false}
              autoComplete="off"
              placeholder="+tag"
              className="task-tag-input h-5 w-0 shrink-0 rounded border-0 bg-transparent px-0 text-[10px] text-muted-foreground outline-none opacity-0 placeholder:text-muted-foreground/45 group-hover:w-10 group-hover:px-1 group-hover:opacity-100 focus:w-16 focus:bg-muted/50 focus:px-1 focus:opacity-100 focus:ring-0"
            />
          </div>
          <div className="flex w-[5.25rem] shrink-0 items-center justify-end gap-0.5">
            {childCount > 0 && (
              <span
                className="text-[10px] tabular-nums text-muted-foreground"
                title="Sub-tugas"
              >
                {doneCount}/{childCount}
              </span>
            )}
            {progress.total > 0 && (
              <span
                className="text-[10px] tabular-nums text-muted-foreground"
                title="Checklist"
              >
                {progress.done}/{progress.total}
              </span>
            )}
            {linked && (
              <button
                type="button"
                title={linked.title || 'Buka catatan'}
                className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground opacity-70 hover:bg-muted hover:text-foreground hover:opacity-100"
                onClick={() => onOpenPage(linked.id)}
              >
                <FileText className="size-3.5" />
              </button>
            )}
            <button
              type="button"
              className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-foreground focus-visible:opacity-100"
              onClick={onOpenDetail}
              aria-label="Buka detail"
              title="Detail"
            >
              <PanelRight className="size-3.5" />
            </button>
          </div>
        </div>

        <input
          value={task.assignee ?? ''}
          onChange={(e) => onChange({ assignee: e.target.value || null })}
          placeholder="—"
          aria-label="Assignee"
          spellCheck={false}
          autoComplete="off"
          className="tasks-col-assignee task-cell h-8 min-w-0 w-full truncate text-[12px] text-muted-foreground"
        />

        <DatePickerField
          compact
          value={task.dueDate}
          onChange={(dueDate) => onChange({ dueDate })}
          placeholder="—"
          className={cn(
            'task-cell text-[12px]',
            ds === 'overdue' && 'font-medium text-red-500',
            ds === 'today' && 'font-medium text-amber-500',
          )}
          aria-label="Due"
        />

        <div className="tasks-col-priority min-w-0">
          <CellMenu
            label="Prioritas"
            value={
              <span
                className="inline-flex items-center gap-1 truncate"
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
                  className="size-2 shrink-0 rounded-full"
                  style={{
                    background:
                      p === 'none' ? 'var(--muted-foreground)' : PRIORITY_META[p].color,
                  }}
                />
                <span
                  className="flex-1"
                  style={{ color: p === 'none' ? undefined : PRIORITY_META[p].color }}
                >
                  {PRIORITY_META[p].label}
                </span>
                {p === task.priority && <Check className="size-3.5 opacity-70" />}
              </DropdownMenuItem>
            ))}
          </CellMenu>
        </div>

        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex size-7 items-center justify-center rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-foreground data-[state=open]:bg-muted data-[state=open]:opacity-100 data-[state=open]:text-foreground"
                aria-label="Aksi tugas"
              >
                <Plus className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuItem onClick={onOpenDetail}>
              <PanelRight className="size-3.5" /> Buka detail
            </DropdownMenuItem>
            {statuses.map((s) => (
              <DropdownMenuItem
                key={s.id}
                onClick={() => onChange({ statusId: s.id })}
              >
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: s.color }}
                />
                {s.name}
                {s.id === task.statusId && (
                  <Check className="ml-auto size-3.5 opacity-70" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onAddSubtask}>
              <ListTree className="size-3.5" /> Tambah sub-tugas
            </DropdownMenuItem>
            {task.parentTaskId && (
              <DropdownMenuItem
                onClick={() => onChange({ parentTaskId: null })}
              >
                <ListTree className="size-3.5" /> Jadikan tugas utama
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => {
                void askPrompt('Tag baru', allTags[0] ?? 'tag', {
                  placeholder: 'nama-tag',
                  confirmLabel: 'Tambah',
                }).then((tag) => {
                  if (tag) addTag(tag)
                })
              }}
            >
              <Tag className="size-3.5" /> Tambah tag
            </DropdownMenuItem>
            {linked ? (
              <>
                <DropdownMenuItem onClick={() => onOpenPage(linked.id)}>
                  <FileText className="size-3.5" /> Buka catatan
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onChange({ pageId: null })}>
                  <Unlink className="size-3.5" /> Lepas tautan
                </DropdownMenuItem>
              </>
            ) : (
              pages.slice(0, 12).map((p) => (
                <DropdownMenuItem
                  key={p.id}
                  onClick={() => onChange({ pageId: p.id })}
                >
                  <Link2 className="size-3.5" />
                  <span className="truncate">
                    {p.icon} {p.title || 'Tanpa judul'}
                  </span>
                </DropdownMenuItem>
              ))
            )}
            {!linked && pages.length === 0 && (
              <DropdownMenuItem disabled>
                <Link2 className="size-3.5" /> Belum ada catatan
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2 className="size-3.5" /> Hapus
            </DropdownMenuItem>
          </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}

function FilterMenu({
  label,
  ariaLabel,
  children,
}: {
  label: string
  ariaLabel: string
  children: ReactNode
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className={cn(
            SELECT_CLS,
            'inline-flex max-w-full items-center gap-1.5 px-2.5 text-left text-muted-foreground hover:text-foreground',
          )}
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

function CellMenu({
  label,
  value,
  children,
}: {
  label: string
  value: ReactNode
  children: ReactNode
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="task-cell flex h-8 w-full min-w-0 items-center truncate rounded-sm px-0 text-left text-[12px] hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
        >
          {value}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-40">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
