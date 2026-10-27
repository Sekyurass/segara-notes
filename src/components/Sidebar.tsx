import { useMemo, useState, type DragEvent } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Moon,
  Plus,
  RotateCcw,
  Search,
  Sun,
  Trash2,
} from 'lucide-react'
import { activePages, buildPageTree, flattenTree, trashedPages } from '@/lib/pages'
import type { Page } from '@/types'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

type Props = {
  pages: Page[]
  activePageId: string
  theme: 'light' | 'dark'
  mobileOpen: boolean
  onCloseMobile: () => void
  onSelect: (id: string) => void
  onCreateRoot: () => void
  onCreateChild: (parentId: string) => void
  onSoftDelete: (id: string) => void
  onRestore: (id: string) => void
  onPurge: (id: string) => void
  onToggleFavorite: (id: string) => void
  onReorder: (fromId: string, toId: string) => void
  onToggleTheme: () => void
  onOpenSearch: () => void
}

function SidebarBody(props: Props) {
  const {
    pages,
    activePageId,
    theme,
    onSelect,
    onCreateRoot,
    onCreateChild,
    onSoftDelete,
    onRestore,
    onPurge,
    onToggleFavorite,
    onReorder,
    onToggleTheme,
    onOpenSearch,
    onCloseMobile,
  } = props

  const live = useMemo(() => activePages(pages), [pages])
  const flat = useMemo(() => flattenTree(buildPageTree(pages)), [pages])
  const favorites = useMemo(() => live.filter((p) => p.favorite), [live])
  const trash = useMemo(() => trashedPages(pages), [pages])
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [showTrash, setShowTrash] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)

  const visible = flat.filter((node) => {
    let parentId = node.parentId
    while (parentId) {
      if (collapsed[parentId]) return false
      parentId = live.find((p) => p.id === parentId)?.parentId ?? null
    }
    return true
  })

  function select(id: string) {
    onSelect(id)
    onCloseMobile()
  }

  function onPageDragStart(e: DragEvent, id: string) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
    setDragId(id)
  }

  function onPageDrop(targetId: string) {
    if (dragId && dragId !== targetId) onReorder(dragId, targetId)
    setDragId(null)
  }

  return (
    <div className="flex h-full flex-col gap-3 bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between gap-2 px-1 pt-1">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold tracking-tight">Segara Notes</div>
          <div className="text-xs text-muted-foreground">Block editor</div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggleTheme}
          aria-label="Ganti tema"
          title="Tema"
        >
          {theme === 'dark' ? <Sun /> : <Moon />}
        </Button>
      </div>

      <div className="flex gap-2">
        <Button className="flex-1" size="sm" onClick={onCreateRoot}>
          <Plus /> Halaman
        </Button>
        <Button variant="secondary" size="sm" onClick={onOpenSearch}>
          <Search />
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-4 pr-2 pb-4">
          {favorites.length > 0 && (
            <section>
              <div className="mb-1 px-2 text-[0.7rem] font-semibold tracking-wider text-muted-foreground uppercase">
                Favorit
              </div>
              <ul className="space-y-0.5">
                {favorites.map((page) => (
                  <li key={`fav-${page.id}`}>
                    <button
                      type="button"
                      onClick={() => select(page.id)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-sidebar-accent',
                        page.id === activePageId && 'bg-sidebar-accent text-sidebar-accent-foreground',
                      )}
                    >
                      <span>{page.icon}</span>
                      <span className="truncate">{page.title || 'Tanpa judul'}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <div className="mb-1 px-2 text-[0.7rem] font-semibold tracking-wider text-muted-foreground uppercase">
              Halaman
            </div>
            <ul className="space-y-0.5">
              {visible.map((page) => {
                const hasChildren = live.some((p) => p.parentId === page.id)
                const isCollapsed = Boolean(collapsed[page.id])
                return (
                  <li
                    key={page.id}
                    className={cn(
                      'group flex items-center gap-0.5 rounded-md',
                      page.id === activePageId && 'bg-sidebar-accent',
                      dragId === page.id && 'opacity-50',
                    )}
                    style={{ paddingLeft: `${page.depth * 12}px` }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault()
                      onPageDrop(page.id)
                    }}
                  >
                    {hasChildren ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="text-muted-foreground"
                        onClick={() =>
                          setCollapsed((prev) => ({ ...prev, [page.id]: !prev[page.id] }))
                        }
                      >
                        {isCollapsed ? <ChevronRight /> : <ChevronDown />}
                      </Button>
                    ) : (
                      <span className="size-6" />
                    )}

                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-sm hover:bg-sidebar-accent/70"
                      draggable
                      onDragStart={(e) => onPageDragStart(e, page.id)}
                      onDragEnd={() => setDragId(null)}
                      onClick={() => select(page.id)}
                    >
                      <span className="shrink-0">{page.icon}</span>
                      <span className="truncate">{page.title || 'Tanpa judul'}</span>
                    </button>

                    <div className="flex opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => onToggleFavorite(page.id)}
                        aria-label="Favorit"
                      >
                        {page.favorite ? '★' : '☆'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => onCreateChild(page.id)}
                        aria-label="Sub-halaman"
                      >
                        <Plus />
                      </Button>
                      {live.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => onSoftDelete(page.id)}
                          aria-label="Trash"
                        >
                          <Trash2 />
                        </Button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>

          <section>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground"
              onClick={() => setShowTrash((v) => !v)}
            >
              <Trash2 /> Trash {trash.length > 0 ? `(${trash.length})` : ''}
            </Button>
            {showTrash && (
              <ul className="mt-1 space-y-0.5">
                {trash.length === 0 && (
                  <li className="px-2 py-1 text-xs text-muted-foreground">Kosong</li>
                )}
                {trash.map((page) => (
                  <li key={`trash-${page.id}`} className="flex items-center gap-1 rounded-md px-1">
                    <span className="min-w-0 flex-1 truncate px-1 text-sm text-muted-foreground">
                      {page.icon} {page.title || 'Tanpa judul'}
                    </span>
                    <Button size="icon-xs" variant="ghost" onClick={() => onRestore(page.id)}>
                      <RotateCcw />
                    </Button>
                    <Button size="icon-xs" variant="ghost" onClick={() => onPurge(page.id)}>
                      <Trash2 />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </ScrollArea>

      <Separator />
      <p className="px-1 pb-1 text-[0.72rem] leading-relaxed text-muted-foreground">
        / blok · @ mention · Ctrl+K cari
      </p>
    </div>
  )
}

export function Sidebar(props: Props) {
  return (
    <>
      <aside className="hidden h-full border-r border-sidebar-border p-3 md:flex md:flex-col">
        <SidebarBody {...props} />
      </aside>

      <Sheet open={props.mobileOpen} onOpenChange={(open) => !open && props.onCloseMobile()}>
        <SheetContent side="left" className="w-[min(20rem,88vw)] p-3">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigasi</SheetTitle>
          </SheetHeader>
          <SidebarBody {...props} />
        </SheetContent>
      </Sheet>
    </>
  )
}
