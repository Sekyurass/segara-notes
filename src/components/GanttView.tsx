import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  formatTimeSpent,
  isDoneStatus,
  taskGanttRange,
} from '@/lib/tasks'
import type { Task, TaskStatus } from '@/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Props = {
  tasks: Task[]
  statuses: TaskStatus[]
  onOpenTask: (id: string) => void
  onPatchTask: (id: string, partial: Partial<Task>) => void
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function daysBetween(a: string, b: string): number {
  const ms =
    new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime()
  return Math.round(ms / 86_400_000)
}

const DAY_W = 28

export function GanttView({ tasks, statuses, onOpenTask, onPatchTask }: Props) {
  const [anchor, setAnchor] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
  })
  const span = 42
  const days = useMemo(
    () => Array.from({ length: span }, (_, i) => addDays(anchor, i)),
    [anchor, span],
  )
  const today = new Date().toISOString().slice(0, 10)

  const rows = useMemo(() => {
    return tasks
      .map((t) => ({ task: t, range: taskGanttRange(t) }))
      .filter((r): r is { task: Task; range: { start: string; end: string } } =>
        Boolean(r.range),
      )
  }, [tasks])

  const workload = useMemo(() => {
    const map = new Map<string, number>()
    for (const { task, range } of rows) {
      const key = task.assignee?.trim() || 'Unassigned'
      const daysLen = Math.max(1, daysBetween(range.start, range.end) + 1)
      map.set(key, (map.get(key) ?? 0) + daysLen)
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [rows])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-4 py-3 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            onClick={() => setAnchor((a) => addDays(a, -14))}
            aria-label="Mundur"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              const d = new Date()
              setAnchor(
                new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10),
              )
            }}
          >
            Hari ini
          </Button>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            onClick={() => setAnchor((a) => addDays(a, 14))}
            aria-label="Maju"
          >
            <ChevronRight className="size-4" />
          </Button>
          <span className="ml-2 text-xs text-muted-foreground">
            {new Date(`${anchor}T12:00:00`).toLocaleDateString('id-ID', {
              month: 'long',
              year: 'numeric',
            })}
          </span>
        </div>
        {workload.length > 0 && (
          <div className="flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
            <span className="font-medium text-foreground/80">Workload</span>
            {workload.slice(0, 6).map(([name, d]) => (
              <span key={name} className="rounded-md bg-muted px-1.5 py-0.5">
                {name}: {d}h
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border">
        <div className="sticky top-0 z-10 flex border-b border-border bg-muted/80 backdrop-blur">
          <div className="w-44 shrink-0 border-r border-border px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:w-52">
            Task
          </div>
          <div className="flex">
            {days.map((day) => {
              const d = new Date(`${day}T12:00:00`)
              const isToday = day === today
              const isSun = d.getDay() === 0
              return (
                <div
                  key={day}
                  className={cn(
                    'flex shrink-0 flex-col items-center border-r border-border/50 py-1 text-[9px]',
                    isToday && 'bg-primary/10 font-semibold text-primary',
                    isSun && !isToday && 'bg-muted/50',
                  )}
                  style={{ width: DAY_W }}
                >
                  <span className="text-muted-foreground">
                    {d.toLocaleDateString('id-ID', { weekday: 'narrow' })}
                  </span>
                  <span>{d.getDate()}</span>
                </div>
              )
            })}
          </div>
        </div>

        {rows.length === 0 && (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            Belum ada task dengan tanggal untuk Gantt.
          </p>
        )}

        {rows.map(({ task, range }) => {
          const status = statuses.find((s) => s.id === task.statusId)
          const done = isDoneStatus(statuses, task.statusId)
          const startOffset = daysBetween(anchor, range.start)
          const len = daysBetween(range.start, range.end) + 1
          const left = startOffset * DAY_W
          const width = Math.max(DAY_W * 0.6, len * DAY_W - 4)

          return (
            <div
              key={task.id}
              className="flex border-b border-border/40 hover:bg-muted/30"
            >
              <button
                type="button"
                className="flex w-44 shrink-0 flex-col justify-center gap-0.5 border-r border-border px-2 py-2 text-left sm:w-52"
                onClick={() => onOpenTask(task.id)}
              >
                <span
                  className={cn(
                    'truncate text-xs font-medium',
                    done && 'text-muted-foreground line-through',
                  )}
                >
                  {task.title || 'Tanpa judul'}
                </span>
                <span className="truncate text-[10px] text-muted-foreground">
                  {status?.name}
                  {task.timeSpentMinutes > 0
                    ? ` · ${formatTimeSpent(task.timeSpentMinutes)}`
                    : ''}
                </span>
              </button>
              <div
                className="relative h-11"
                style={{ width: span * DAY_W }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const dayIdx = Math.floor(e.nativeEvent.offsetX / DAY_W)
                  if (dayIdx < 0 || dayIdx >= span) return
                  const newStart = days[dayIdx]!
                  const dur = daysBetween(range.start, range.end)
                  onPatchTask(task.id, {
                    startDate: newStart,
                    dueDate: addDays(newStart, dur),
                  })
                }}
              >
                {startOffset < span && startOffset + len > 0 && (
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/task-id', task.id)
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    className={cn(
                      'absolute top-2 h-6 cursor-grab rounded-md px-1.5 text-[10px] font-medium leading-6 text-white active:cursor-grabbing',
                      done && 'opacity-50',
                    )}
                    style={{
                      left: Math.max(0, left) + 2,
                      width: Math.min(
                        width,
                        (span - Math.max(0, startOffset)) * DAY_W - 4,
                      ),
                      backgroundColor: status?.color || 'var(--primary)',
                    }}
                    title={`${range.start} → ${range.end}`}
                    onClick={() => onOpenTask(task.id)}
                  >
                    <span className="block truncate">{task.title || '…'}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
