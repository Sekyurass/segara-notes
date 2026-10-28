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
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <h1 className="mb-1 text-[1.35rem] font-semibold tracking-tight">Aktivitas</h1>
      <p className="mb-5 text-[13px] text-muted-foreground">
        Riwayat perubahan lokal di workspace ini.
      </p>
      {!events.length ? (
        <p className="text-[13px] text-muted-foreground">Belum ada aktivitas tercatat.</p>
      ) : (
        <ul className="overflow-hidden rounded-lg border border-border/50 bg-card/20">
          {events.map((e) => (
            <li
              key={e.id}
              className="flex flex-wrap items-start justify-between gap-2 border-b border-border/30 px-3 py-2.5 last:border-b-0 hover:bg-muted/30"
            >
              <div className="min-w-0 flex-1">
                <div className="text-[13px]">{e.summary}</div>
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
