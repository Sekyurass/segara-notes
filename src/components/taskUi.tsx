import type { ComponentProps, ReactNode } from 'react'
import { Check, Flag } from 'lucide-react'
import { PRIORITY_META } from '@/lib/tasks'
import type { TaskPriority, TaskStatus } from '@/types'
import { cn } from '@/lib/utils'

/** ClickUp-like dense columns: Name · Assignee · Due · Priority */
export const CU_GRID =
  'grid grid-cols-[minmax(12rem,1fr)_5.5rem_5.5rem_6.5rem] items-center gap-x-2'

export function formatDueShort(iso: string | null | undefined) {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return `${m}/${d}/${String(y).slice(2)}`
}

export function statusLabel(status: TaskStatus) {
  if (status.category === 'done' || status.category === 'closed') {
    if (/done|complete|selesai/i.test(status.name)) return 'COMPLETE'
  }
  if (status.category === 'open') {
    if (/open|to\s?do|todo|belum/i.test(status.name)) return 'TO DO'
  }
  return status.name.toUpperCase()
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
}

export function StatusChip({ status }: { status: TaskStatus }) {
  const label = statusLabel(status)
  const done = status.category === 'done' || status.category === 'closed'
  const active = status.category === 'active'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-[3px] text-[11px] font-bold tracking-wide',
        done && 'bg-emerald-500/20 text-emerald-500 dark:text-emerald-400',
        active && 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
        !done && !active && 'border border-border/80 bg-transparent text-foreground/80',
      )}
      style={
        !done && !active && status.color
          ? { borderColor: `${status.color}66`, color: status.color }
          : undefined
      }
    >
      {done && <Check className="size-3" strokeWidth={3} />}
      {label}
    </span>
  )
}

export function PriorityCell({ priority }: { priority: TaskPriority }) {
  const meta = PRIORITY_META[priority]
  if (priority === 'none') {
    return <span className="text-[12px] text-muted-foreground/50">—</span>
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px]" style={{ color: meta.color }}>
      <Flag className="size-3.5 shrink-0" fill={meta.color} fillOpacity={0.35} />
      <span className="truncate font-medium">{meta.label}</span>
    </span>
  )
}

export function AssigneeCell({ name }: { name: string | null | undefined }) {
  if (!name?.trim()) {
    return (
      <span className="inline-flex size-6 items-center justify-center rounded-full border border-dashed border-border/70 text-[10px] text-muted-foreground">
        +
      </span>
    )
  }
  return (
    <span
      className="inline-flex size-6 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground shadow-sm"
      title={name}
    >
      {initials(name)}
    </span>
  )
}

export function TaskCheck({
  done,
  onToggle,
}: {
  done: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      className={cn(
        'flex size-[15px] shrink-0 items-center justify-center rounded-full border transition-colors',
        done
          ? 'border-emerald-500 bg-emerald-500 text-white'
          : 'border-muted-foreground/45 hover:border-primary',
      )}
      aria-label={done ? 'Tandai belum selesai' : 'Tandai selesai'}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
    >
      {done && <Check className="size-2.5" strokeWidth={3} />}
    </button>
  )
}

export function ViewTabs<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: Array<{ id: T; label: string; icon?: ReactNode }>
  onChange: (id: T) => void
}) {
  return (
    <div className="flex items-center gap-0.5">
      {options.map(({ id, label, icon }) => (
        <button
          key={id}
          type="button"
          className={cn(
            'relative inline-flex h-8 items-center gap-1.5 px-2.5 text-[13px] transition-colors',
            value === id
              ? 'font-medium text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
          onClick={() => onChange(id)}
        >
          {icon}
          {label}
          {value === id && (
            <span className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-foreground" />
          )}
        </button>
      ))}
    </div>
  )
}

export function CuPrimaryButton({
  children,
  className,
  ...props
}: ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2.5 text-[12px] font-semibold text-primary-foreground hover:bg-primary/90',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
