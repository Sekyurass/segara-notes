import { useEffect, useState } from 'react'
import {
  clickupFetchTask,
  mapClickUpPriority,
  parseClickUpTaskUrl,
  type ClickUpTask,
} from '@/lib/clickup'
import { loadPrefs } from '@/lib/prefs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Props = {
  url: string
  onChangeUrl?: (url: string) => void
}

export function ClickUpEmbedCard({ url, onChangeUrl }: Props) {
  const taskId = parseClickUpTaskUrl(url)
  const [task, setTask] = useState<ClickUpTask | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [draft, setDraft] = useState(url)

  useEffect(() => {
    setDraft(url)
  }, [url])

  useEffect(() => {
    if (!taskId) {
      setTask(null)
      setError(null)
      return
    }
    const token = loadPrefs().clickupToken.trim()
    if (!token) {
      setTask(null)
      setError('Isi token ClickUp di Pengaturan')
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    void clickupFetchTask(token, taskId)
      .then((t) => {
        if (!cancelled) setTask(t)
      })
      .catch(() => {
        if (!cancelled) {
          setTask(null)
          setError('Gagal memuat task (token / CORS / ID)')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [taskId])

  const due =
    task?.due_date && Number(task.due_date)
      ? new Date(Number(task.due_date)).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : null
  const priority = task ? mapClickUpPriority(task.priority) : 'none'

  return (
    <div className="mb-2 overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-3 py-1.5">
        <span className="text-[10px] font-semibold tracking-wide text-violet-600 dark:text-violet-400">
          CLICKUP
        </span>
        <a
          href={url.startsWith('http') ? url : `https://${url}`}
          target="_blank"
          rel="noreferrer"
          className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground hover:text-foreground"
        >
          {url}
        </a>
      </div>
      {onChangeUrl && (
        <div className="flex gap-2 border-b border-border/40 px-3 py-2">
          <Input
            className="h-8 text-xs"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="https://app.clickup.com/t/…"
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => onChangeUrl(draft.trim())}
          >
            Muat
          </Button>
        </div>
      )}
      <div className="px-3 py-2.5">
        {loading && <p className="text-xs text-muted-foreground">Memuat…</p>}
        {!loading && error && <p className="text-xs text-destructive">{error}</p>}
        {!loading && !error && !taskId && (
          <p className="text-xs text-muted-foreground">
            Tempel URL task ClickUp (app.clickup.com/t/…)
          </p>
        )}
        {!loading && task && (
          <div className="space-y-1.5">
            <div className="text-sm font-semibold leading-snug">
              {task.name || 'Tanpa judul'}
            </div>
            <div className="flex flex-wrap gap-2 text-[11px]">
              {task.status?.status && (
                <span className="rounded-md bg-muted px-1.5 py-0.5 font-medium capitalize">
                  {task.status.status}
                </span>
              )}
              {due && (
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-muted-foreground">
                  Due {due}
                </span>
              )}
              {priority !== 'none' && (
                <span className="rounded-md bg-muted px-1.5 py-0.5 capitalize text-muted-foreground">
                  {priority}
                </span>
              )}
              {(task.assignees?.[0]?.username || task.tags?.length) && (
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-muted-foreground">
                  {[
                    task.assignees?.[0]?.username,
                    ...(task.tags ?? []).slice(0, 2).map((t) => t.name),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
