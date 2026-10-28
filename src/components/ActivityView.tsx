import type { Workspace } from '@/types'
import { Button } from '@/components/ui/button'

type Props = {
  workspace: Workspace
  onOpenPage: (pageId: string) => void
  onOpenTask: (taskId: string) => void
}

export function ActivityView({ workspace, onOpenPage, onOpenTask }: Props) {
  const events = workspace.activity ?? []

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Aktivitas</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Riwayat perubahan lokal di workspace ini.
      </p>
      {!events.length ? (
        <p className="text-sm text-muted-foreground">Belum ada aktivitas tercatat.</p>
      ) : (
        <ul className="space-y-2">
          {events.map((e) => (
            <li
              key={e.id}
              className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border/60 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm">{e.summary}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {e.actor || 'Sistem'} · {new Date(e.at).toLocaleString('id-ID')} · {e.kind}
                </div>
              </div>
              <div className="flex gap-1">
                {e.pageId && (
                  <Button type="button" size="xs" variant="ghost" onClick={() => onOpenPage(e.pageId!)}>
                    Halaman
                  </Button>
                )}
                {e.taskId && (
                  <Button type="button" size="xs" variant="ghost" onClick={() => onOpenTask(e.taskId!)}>
                    Tugas
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
