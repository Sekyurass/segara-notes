import { useEffect, useMemo, useState } from 'react'
import { searchWorkspace } from '@/lib/pages'
import type { Workspace } from '@/types'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'

type Props = {
  open: boolean
  workspace: Workspace
  onClose: () => void
  onSelect: (pageId: string) => void
}

export function CommandPalette({ open, workspace, onClose, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const hits = useMemo(() => searchWorkspace(workspace, query), [workspace, query])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      title="Cari halaman"
      description="Cari judul atau isi blok"
    >
      <CommandInput
        placeholder="Cari halaman atau isi blok…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>Tidak ada hasil</CommandEmpty>
        <CommandGroup heading="Hasil">
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
