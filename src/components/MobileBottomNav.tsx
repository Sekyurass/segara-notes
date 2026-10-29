import { CheckSquare, FileText, History, Home } from 'lucide-react'
import type { AppMode } from '@/types'
import { cn } from '@/lib/utils'

type Props = {
  mode: AppMode
  onSetMode: (mode: AppMode) => void
}

const items: Array<{ mode: AppMode; label: string; icon: typeof FileText }> = [
  { mode: 'home', label: 'Beranda', icon: Home },
  { mode: 'notes', label: 'Catatan', icon: FileText },
  { mode: 'tasks', label: 'Tugas', icon: CheckSquare },
  { mode: 'activity', label: 'Aktivitas', icon: History },
]

export function MobileBottomNav({ mode, onSetMode }: Props) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      aria-label="Navigasi utama"
    >
      <div className="mx-auto grid max-w-lg grid-cols-4">
        {items.map(({ mode: m, label, icon: Icon }) => {
          const active = mode === m
          return (
            <button
              key={m}
              type="button"
              className={cn(
                'flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium',
                active ? 'text-primary' : 'text-muted-foreground',
              )}
              onClick={() => onSetMode(m)}
            >
              <span
                className={cn(
                  'flex size-8 items-center justify-center rounded-lg transition-colors',
                  active && 'bg-primary/15',
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
              </span>
              {label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
