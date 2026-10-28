import { useEffect, useMemo, useState } from 'react'
import { CheckSquare, FilePlus2, History } from 'lucide-react'
import { searchWorkspace } from '@/lib/pages'
import { searchTasks } from '@/lib/tasks'
import { PAGE_TEMPLATES } from '@/lib/templates'
import type { Workspace } from '@/types'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'

type Props = {
  open: boolean
  workspace: Workspace
  onClose: () => void
  onSelect: (pageId: string) => void
  onSelectTask?: (taskId: string) => void
  onCreateBlank: () => void
  onCreateFromTemplate: (templateId: string) => void
}

export function CommandPalette({
  open,
  workspace,
  onClose,
  onSelect,
  onSelectTask,
  onCreateBlank,
  onCreateFromTemplate,
}: Props) {
  const [query, setQuery] = useState('')
  const hits = useMemo(() => searchWorkspace(workspace, query), [workspace, query])
  const taskHits = useMemo(
    () => (query.trim() ? searchTasks(workspace.tasks, query).slice(0, 8) : []),
    [workspace.tasks, query],
  )
  const recent = useMemo(() => {
    const byId = new Map(workspace.pages.map((p) => [p.id, p]))
    return (workspace.recentPageIds ?? [])
      .map((id) => byId.get(id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p && !p.deletedAt))
      .slice(0, 6)
  }, [workspace])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      title="Cari"
      description="Cari halaman, tugas, atau buat dari template"
    >
      <CommandInput
        placeholder="Cari halaman atau tugas…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>Tidak ada hasil</CommandEmpty>

        {!query && recent.length > 0 && (
          <CommandGroup heading="Terakhir dibuka">
            {recent.map((page) => (
              <CommandItem
                key={`recent-${page.id}`}
                value={`recent ${page.title}`}
                onSelect={() => {
                  onSelect(page.id)
                  onClose()
                }}
              >
                <History className="size-4 opacity-70" />
                <span className="text-base">{page.icon}</span>
                <span className="truncate font-medium">{page.title || 'Tanpa judul'}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandGroup heading="Buat">
          <CommandItem
            value="buat halaman kosong"
            onSelect={() => {
              onCreateBlank()
              onClose()
            }}
          >
            <FilePlus2 className="size-4 opacity-70" />
            Halaman kosong
          </CommandItem>
          {PAGE_TEMPLATES.filter((t) => t.id !== 'blank').map((tpl) => (
            <CommandItem
              key={tpl.id}
              value={`template ${tpl.label} ${tpl.hint}`}
              onSelect={() => {
                onCreateFromTemplate(tpl.id)
                onClose()
              }}
            >
              <span className="text-base">{tpl.icon}</span>
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-medium">{tpl.label}</span>
                <span className="truncate text-xs text-muted-foreground">{tpl.hint}</span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {taskHits.length > 0 && onSelectTask && (
          <CommandGroup heading="Tugas">
            {taskHits.map((task) => (
              <CommandItem
                key={task.id}
                value={`task ${task.title} ${task.tags.join(' ')}`}
                onSelect={() => {
                  onSelectTask(task.id)
                  onClose()
                }}
              >
                <CheckSquare className="size-4 opacity-70" />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{task.title || 'Tanpa judul'}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {[task.assignee, task.dueDate, ...task.tags].filter(Boolean).join(' · ') ||
                      'Tugas'}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandGroup heading="Halaman">
          {hits.map((hit, i) => (
            <CommandItem
              key={`${hit.pageId}-${i}`}
              value={`${hit.title} ${hit.snippet}`}
              onSelect={() => {
                onSelect(hit.pageId)
                onClose()
              }}
            >
              <span className="text-base">{hit.icon}</span>
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-medium">{hit.title}</span>
                <span className="truncate text-xs text-muted-foreground">{hit.snippet}</span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
