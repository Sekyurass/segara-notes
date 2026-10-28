import { useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Clock, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function parseISODate(iso: string | null | undefined): Date | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null
  const d = new Date(`${iso}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatDisplayDate(iso: string | null | undefined) {
  const d = parseISODate(iso)
  if (!d) return null
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const WEEKDAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

const TIME_SLOTS: string[] = (() => {
  const slots: string[] = []
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 15, 30, 45]) {
      slots.push(`${pad(h)}:${pad(m)}`)
    }
  }
  return slots
})()

type DatePickerProps = {
  value: string | null
  onChange: (next: string | null) => void
  className?: string
  compact?: boolean
  placeholder?: string
  'aria-label'?: string
}

export function DatePickerField({
  value,
  onChange,
  className,
  compact = false,
  placeholder = 'Pilih tanggal',
  'aria-label': ariaLabel = 'Tanggal',
}: DatePickerProps) {
  const selected = parseISODate(value)
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState(() => {
    const base = selected ?? new Date()
    return new Date(base.getFullYear(), base.getMonth(), 1)
  })

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startWeekday = new Date(year, month, 1).getDay()
  const label = cursor.toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  })

  const cells = useMemo(() => {
    const list: (number | null)[] = [
      ...Array.from({ length: startWeekday }, () => null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ]
    while (list.length % 7 !== 0) list.push(null)
    return list
  }, [daysInMonth, startWeekday])

  function dayISO(day: number) {
    return `${year}-${pad(month + 1)}-${pad(day)}`
  }

  const today = toISODate(new Date())
  const display = formatDisplayDate(value)

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          const base = selected ?? new Date()
          setCursor(new Date(base.getFullYear(), base.getMonth(), 1))
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className={cn(
            'inline-flex w-full items-center gap-1.5 rounded-md text-left transition-colors',
            compact
              ? 'h-8 min-w-0 truncate px-0 text-[12px] text-muted-foreground hover:text-foreground'
              : 'h-8 border border-border bg-background px-2.5 text-[13px] hover:bg-muted/40',
            !display && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarDays
            className={cn(
              'shrink-0 opacity-70',
              compact ? 'size-3.5' : 'size-3.5',
            )}
          />
          <span className="min-w-0 flex-1 truncate">
            {display ?? placeholder}
          </span>
          {value && (
            <span
              role="button"
              tabIndex={-1}
              className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onChange(null)
              }}
              aria-label="Hapus tanggal"
            >
              <X className="size-3" />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[17.5rem] p-3"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="mb-2 flex items-center justify-between gap-1">
          <button
            type="button"
            className="flex size-7 items-center justify-center rounded-md hover:bg-muted"
            onClick={() =>
              setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))
            }
            aria-label="Bulan sebelumnya"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="text-[13px] font-semibold capitalize">{label}</div>
          <button
            type="button"
            className="flex size-7 items-center justify-center rounded-md hover:bg-muted"
            onClick={() =>
              setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))
            }
            aria-label="Bulan berikutnya"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <div className="mb-1 grid grid-cols-7 gap-0.5">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="py-1 text-center text-[10px] font-medium text-muted-foreground"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, i) => {
            if (day == null) {
              return <div key={`e-${i}`} className="size-8" />
            }
            const iso = dayISO(day)
            const isSelected = value === iso
            const isToday = iso === today
            return (
              <button
                key={iso}
                type="button"
                className={cn(
                  'flex size-8 items-center justify-center rounded-md text-[12px] tabular-nums transition-colors',
                  isSelected
                    ? 'bg-primary font-semibold text-primary-foreground'
                    : 'hover:bg-muted',
                  !isSelected && isToday && 'ring-1 ring-border font-medium',
                )}
                onClick={() => {
                  onChange(iso)
                  setOpen(false)
                }}
              >
                {day}
              </button>
            )
          })}
        </div>
        <div className="mt-2 flex gap-1.5 border-t border-border/60 pt-2">
          <button
            type="button"
            className="h-7 flex-1 rounded-md text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => {
              onChange(today)
              setOpen(false)
            }}
          >
            Hari ini
          </button>
          <button
            type="button"
            className="h-7 flex-1 rounded-md text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => {
              onChange(null)
              setOpen(false)
            }}
          >
            Hapus
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

type TimePickerProps = {
  value: string | null
  onChange: (next: string | null) => void
  className?: string
  placeholder?: string
  'aria-label'?: string
}

export function TimePickerField({
  value,
  onChange,
  className,
  placeholder = 'Pilih jam',
  'aria-label': ariaLabel = 'Jam',
}: TimePickerProps) {
  const [open, setOpen] = useState(false)
  const valid = value && /^\d{2}:\d{2}$/.test(value) ? value : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className={cn(
            'inline-flex h-8 w-full items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-left text-[13px] transition-colors hover:bg-muted/40',
            !valid && 'text-muted-foreground',
            className,
          )}
        >
          <Clock className="size-3.5 shrink-0 opacity-70" />
          <span className="min-w-0 flex-1 truncate tabular-nums">
            {valid ?? placeholder}
          </span>
          {valid && (
            <span
              role="button"
              tabIndex={-1}
              className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onChange(null)
              }}
              aria-label="Hapus jam"
            >
              <X className="size-3" />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-44 p-2"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="mb-1.5 px-1 text-[11px] font-medium text-muted-foreground">
          Pilih jam
        </div>
        <div className="segara-scroll max-h-56 overflow-y-auto pr-0.5">
          <ul className="flex flex-col gap-0.5">
            {TIME_SLOTS.map((slot) => (
              <li key={slot}>
                <button
                  type="button"
                  className={cn(
                    'flex h-7 w-full items-center rounded-md px-2 text-left text-[12px] tabular-nums hover:bg-muted',
                    valid === slot &&
                      'bg-primary/15 font-medium text-primary',
                  )}
                  onClick={() => {
                    onChange(slot)
                    setOpen(false)
                  }}
                >
                  {slot}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          className="mt-1.5 h-7 w-full rounded-md border border-border/60 text-[12px] text-muted-foreground hover:bg-muted"
          onClick={() => {
            onChange(null)
            setOpen(false)
          }}
        >
          Hapus jam
        </button>
      </PopoverContent>
    </Popover>
  )
}
