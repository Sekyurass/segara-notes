import { useMemo, useState, type DragEvent, type ReactNode } from 'react'
import {
  CalendarDays,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  FileText,
  History,
  Home,
  MoreHorizontal,
  Moon,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  Sun,
  Trash2,
} from 'lucide-react'
import {
  activePages,
  buildPageTree,
  flattenTree,
  trashedPages,
  type PageDropMode,
} from '@/lib/pages'
import { foldersInSpace, listsInFolder } from '@/lib/tasks'
import type { AppMode, Page, TaskFolder, TaskList, TaskSpace } from '@/types'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

type Props = {
  pages: Page[]
  activePageId: string
  theme: 'light' | 'dark'
  mode: AppMode
  taskLists?: TaskList[]
  taskSpaces?: TaskSpace[]
  taskFolders?: TaskFolder[]
  activeTaskListId?: string
  activitySummaries?: Array<{ id: string; summary: string; at: number }>
  mobileOpen: boolean
  onCloseMobile: () => void
  onSelect: (id: string) => void
  onSetMode: (mode: AppMode) => void
  onOpenToday?: () => void
  onSelectTaskList?: (id: string) => void
  onCreateTaskSpace?: () => void
  onRenameTaskSpace?: (id: string) => void
  onDeleteTaskSpace?: (id: string) => void
  onCreateTaskFolder?: (spaceId: string) => void
  onRenameTaskFolder?: (id: string) => void
  onDeleteTaskFolder?: (id: string) => void
  onCreateTaskList?: (folderId: string | null) => void
  onRenameTaskList?: (id: string) => void
  onDeleteTaskList?: (id: string) => void
  onChangeTaskListIcon?: (id: string) => void
  onCreateRoot: () => void
  onRestore: (id: string) => void
  onPurge: (id: string) => void
  onReorder: (fromId: string, toId: string, mode: PageDropMode) => void
  onToggleTheme: () => void
  onOpenSearch: () => void
  onOpenSettings?: () => void
}

const RAIL: Array<{
  mode: AppMode
  label: string
  icon: typeof Home
}> = [
  { mode: 'home', label: 'Beranda', icon: Home },
  { mode: 'tasks', label: 'Tugas', icon: CheckSquare },
  { mode: 'notes', label: 'Catatan', icon: FileText },
  { mode: 'activity', label: 'Aktivitas', icon: History },
]

function RailButton({
  active,
  label,
  onClick,
  children,
}: {
  active?: boolean
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex size-9 items-center justify-center rounded-lg transition-colors',
        active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:bg-white/10 hover:text-foreground',
      )}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function SidebarBody(props: Props) {
  const {
    pages,
    activePageId,
    theme,
    mode,
    taskLists = [],
    taskSpaces = [],
    taskFolders = [],
    activeTaskListId,
    activitySummaries = [],
    onSelect,
    onSetMode,
    onOpenToday,
    onSelectTaskList,
    onCreateTaskSpace,
    onRenameTaskSpace,
    onDeleteTaskSpace,
    onCreateTaskFolder,
    onRenameTaskFolder,
    onDeleteTaskFolder,
    onCreateTaskList,
    onRenameTaskList,
    onDeleteTaskList,
    onChangeTaskListIcon,
    onCreateRoot,
    onRestore,
    onPurge,
    onReorder,
    onToggleTheme,
    onOpenSearch,
    onOpenSettings,
    onCloseMobile,
  } = props

  const live = useMemo(() => activePages(pages), [pages])
  const flat = useMemo(() => flattenTree(buildPageTree(pages)), [pages])
  const favorites = useMemo(() => live.filter((p) => p.favorite), [live])
  const trash = useMemo(() => trashedPages(pages), [pages])
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [taskCollapsed, setTaskCollapsed] = useState<Record<string, boolean>>({})
  const [showTrash, setShowTrash] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<{ id: string; mode: PageDropMode } | null>(null)

  function toggleTaskNode(id: string) {
    setTaskCollapsed((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  function modeFromEvent(e: DragEvent<HTMLElement>): PageDropMode {
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const ratio = y / rect.height
    if (ratio < 0.28) return 'before'
    if (ratio > 0.72) return 'after'
    return 'into'
  }

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

  function onPageDrop(targetId: string, mode: PageDropMode) {
    if (dragId && dragId !== targetId) onReorder(dragId, targetId, mode)
    setDragId(null)
    setDropTarget(null)
  }

  const panelTitle =
    mode === 'home'
      ? 'Beranda'
      : mode === 'tasks'
        ? 'Spaces'
        : mode === 'notes'
          ? 'Catatan'
          : 'Aktivitas'

  const showTaskTree = mode === 'tasks'
  const showNotesTree = mode === 'notes'
  const showHomePanel = mode === 'home'

  return (
    <div className="flex h-full min-w-0 bg-sidebar text-sidebar-foreground">
      {/* ClickUp-style icon rail */}
      <div className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-sidebar-border bg-black/20 py-2.5 dark:bg-black/50">
        <span className="mb-1 flex size-8 items-center justify-center rounded-lg bg-primary text-[0.7rem] font-bold text-primary-foreground">
          S
        </span>
        <div className="flex flex-1 flex-col items-center gap-1">
          {RAIL.map(({ mode: m, label, icon: Icon }) => (
            <RailButton
              key={m}
              label={label}
              active={mode === m}
              onClick={() => {
                onSetMode(m)
                onCloseMobile()
              }}
            >
              <Icon className="size-4" strokeWidth={mode === m ? 2.25 : 1.75} />
            </RailButton>
          ))}
          {onOpenToday && (
            <RailButton
              label="Hari ini"
              onClick={() => {
                onOpenToday()
                onCloseMobile()
              }}
            >
              <CalendarDays className="size-4" />
            </RailButton>
          )}
        </div>
        <RailButton label="Cari" onClick={onOpenSearch}>
          <Search className="size-4" />
        </RailButton>
        <RailButton
          label={theme === 'dark' ? 'Mode terang' : 'Mode gelap'}
          onClick={onToggleTheme}
        >
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </RailButton>
        {onOpenSettings && (
          <RailButton label="Pengaturan" onClick={onOpenSettings}>
            <Settings2 className="size-4" />
          </RailButton>
        )}
      </div>

      {/* Secondary panel */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-1 border-b border-sidebar-border/70 px-2.5 py-2">
          <span className="min-w-0 flex-1 truncate px-1 text-[13px] font-semibold">
            {panelTitle}
          </span>
          {showNotesTree && (
            <button
              type="button"
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              title="Halaman baru"
              onClick={onCreateRoot}
            >
              <Plus className="size-3.5" />
            </button>
          )}
          {showTaskTree && onCreateTaskSpace && (
            <button
              type="button"
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              title="Space baru"
              onClick={onCreateTaskSpace}
            >
              <Plus className="size-3.5" />
            </button>
          )}
        </div>

        <ScrollArea className="min-h-0 flex-1 px-1.5">
          {showHomePanel && (
            <div className="flex flex-col gap-0.5 px-0.5 pb-3 pt-1.5">
              <button
                type="button"
                className="flex h-8 items-center gap-2 rounded-md px-2 text-[13px] text-sidebar-foreground/90 hover:bg-sidebar-accent/70"
                onClick={() => {
                  onOpenToday?.()
                  onCloseMobile()
                }}
              >
                <CalendarDays className="size-3.5 opacity-80" />
                Hari ini
              </button>
              <button
                type="button"
                className="flex h-8 items-center gap-2 rounded-md px-2 text-[13px] text-sidebar-foreground/90 hover:bg-sidebar-accent/70"
                onClick={() => {
                  onSetMode('tasks')
                  onCloseMobile()
                }}
              >
                <CheckSquare className="size-3.5 opacity-80" />
                Semua tugas
              </button>
              <button
                type="button"
                className="flex h-8 items-center gap-2 rounded-md px-2 text-[13px] text-sidebar-foreground/90 hover:bg-sidebar-accent/70"
                onClick={() => {
                  onSetMode('notes')
                  onCloseMobile()
                }}
              >
                <FileText className="size-3.5 opacity-80" />
                Catatan
              </button>
              <p className="mt-2 px-2 text-[11px] leading-relaxed text-muted-foreground">
                Ringkasan di panel utama. Hierarchy Space/List muncul saat mode Tugas.
              </p>
            </div>
          )}

          {showTaskTree && (
            <div className="flex flex-col gap-1 pb-3 pt-1.5">
              <div className="px-2 py-1 text-[11px] font-medium text-muted-foreground/80">
                Spaces
              </div>
              <ul className="flex flex-col gap-0.5">
                {[...taskSpaces]
                  .sort((a, b) => a.order - b.order)
                  .map((space) => {
                    const spaceOpen = !taskCollapsed[space.id]
                    const folders = foldersInSpace(taskFolders, space.id)
                    return (
                      <li key={space.id}>
                        <div className="group flex items-center gap-0.5 rounded-md px-1 hover:bg-sidebar-accent/50">
                          <button
                            type="button"
                            className="flex size-5 shrink-0 items-center justify-center text-muted-foreground"
                            onClick={() => toggleTaskNode(space.id)}
                            aria-label={spaceOpen ? 'Ciutkan' : 'Bentangkan'}
                          >
                            {spaceOpen ? (
                              <ChevronDown className="size-3.5" />
                            ) : (
                              <ChevronRight className="size-3.5" />
                            )}
                          </button>
                          <span className="min-w-0 flex-1 truncate py-1 text-[12px] font-semibold">
                            {space.name}
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="flex size-5 items-center justify-center rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-sidebar-accent"
                                aria-label="Menu space"
                              >
                                <MoreHorizontal className="size-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="min-w-36">
                              {onCreateTaskFolder && (
                                <DropdownMenuItem
                                  onClick={() => onCreateTaskFolder(space.id)}
                                >
                                  Folder baru
                                </DropdownMenuItem>
                              )}
                              {onRenameTaskSpace && (
                                <DropdownMenuItem
                                  onClick={() => onRenameTaskSpace(space.id)}
                                >
                                  Ganti nama
                                </DropdownMenuItem>
                              )}
                              {onDeleteTaskSpace && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => onDeleteTaskSpace(space.id)}
                                  >
                                    Hapus space
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        {spaceOpen && (
                          <ul className="ml-2 border-l border-sidebar-border/60 pl-1">
                            {folders.map((folder) => {
                              const folderOpen = !taskCollapsed[folder.id]
                              const lists = listsInFolder(taskLists, folder.id)
                              return (
                                <li key={folder.id}>
                                  <div className="group flex items-center gap-0.5 rounded-md px-1 hover:bg-sidebar-accent/50">
                                    <button
                                      type="button"
                                      className="flex size-5 shrink-0 items-center justify-center text-muted-foreground"
                                      onClick={() => toggleTaskNode(folder.id)}
                                    >
                                      {folderOpen ? (
                                        <ChevronDown className="size-3.5" />
                                      ) : (
                                        <ChevronRight className="size-3.5" />
                                      )}
                                    </button>
                                    <span className="min-w-0 flex-1 truncate py-1 text-[12px] font-medium text-muted-foreground">
                                      {folder.name}
                                    </span>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <button
                                          type="button"
                                          className="flex size-5 items-center justify-center rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-sidebar-accent"
                                        >
                                          <MoreHorizontal className="size-3.5" />
                                        </button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="start" className="min-w-36">
                                        {onCreateTaskList && (
                                          <DropdownMenuItem
                                            onClick={() => onCreateTaskList(folder.id)}
                                          >
                                            List baru
                                          </DropdownMenuItem>
                                        )}
                                        {onRenameTaskFolder && (
                                          <DropdownMenuItem
                                            onClick={() => onRenameTaskFolder(folder.id)}
                                          >
                                            Ganti nama
                                          </DropdownMenuItem>
                                        )}
                                        {onDeleteTaskFolder && (
                                          <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                              className="text-destructive"
                                              onClick={() => onDeleteTaskFolder(folder.id)}
                                            >
                                              Hapus folder
                                            </DropdownMenuItem>
                                          </>
                                        )}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                  {folderOpen && (
                                    <ul>
                                      {lists.map((l) => (
                                        <li key={l.id}>
                                          <div
                                            className={cn(
                                              'group flex w-full items-center gap-0.5 rounded-md pr-1',
                                              l.id === activeTaskListId &&
                                                mode === 'tasks'
                                                ? 'bg-primary/15 font-medium text-primary'
                                                : 'text-sidebar-foreground/90 hover:bg-sidebar-accent/70',
                                            )}
                                          >
                                            <button
                                              type="button"
                                              onClick={() => {
                                                onSelectTaskList?.(l.id)
                                                onCloseMobile()
                                              }}
                                              className="flex min-w-0 flex-1 items-center gap-1.5 px-2 py-[5px] text-left text-[13px]"
                                            >
                                              <span className="shrink-0 text-[13px] leading-none">
                                                {l.icon}
                                              </span>
                                              <span className="truncate">{l.name}</span>
                                            </button>
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <button
                                                  type="button"
                                                  className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted"
                                                >
                                                  <MoreHorizontal className="size-3.5" />
                                                </button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent
                                                align="end"
                                                className="min-w-36"
                                              >
                                                {onRenameTaskList && (
                                                  <DropdownMenuItem
                                                    onClick={() => onRenameTaskList(l.id)}
                                                  >
                                                    Ganti nama
                                                  </DropdownMenuItem>
                                                )}
                                                {onChangeTaskListIcon && (
                                                  <DropdownMenuItem
                                                    onClick={() => onChangeTaskListIcon(l.id)}
                                                  >
                                                    Ganti ikon
                                                  </DropdownMenuItem>
                                                )}
                                                {onDeleteTaskList && (
                                                  <>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                      className="text-destructive"
                                                      onClick={() => onDeleteTaskList(l.id)}
                                                    >
                                                      Hapus list
                                                    </DropdownMenuItem>
                                                  </>
                                                )}
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </li>
                    )
                  })}
              </ul>
            </div>
          )}

          {showNotesTree && (
            <div className="flex flex-col gap-3 pb-3 pt-1.5">
              {favorites.length > 0 && (
                <section>
                  <div className="px-2 py-1 text-[11px] font-medium text-muted-foreground/80">
                    Favorit
                  </div>
                  <ul>
                    {favorites.map((page) => (
                      <li key={`fav-${page.id}`}>
                        <button
                          type="button"
                          onClick={() => select(page.id)}
                          className={cn(
                            'flex w-full items-center gap-1.5 rounded-md px-2 py-[5px] text-left text-[13px] transition-colors',
                            page.id === activePageId
                              ? 'bg-primary/15 font-medium text-primary'
                              : 'text-sidebar-foreground/90 hover:bg-sidebar-accent/70',
                          )}
                        >
                          <span className="shrink-0 text-[13px] leading-none opacity-90">
                            {page.icon}
                          </span>
                          <span className="truncate">{page.title || 'Tanpa judul'}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section>
                <div className="px-2 py-1 text-[11px] font-medium text-muted-foreground/80">
                  Halaman
                </div>
                <ul>
                  {visible.map((page) => {
                    const hasChildren = live.some((p) => p.parentId === page.id)
                    const isCollapsed = Boolean(collapsed[page.id])
                    return (
                      <li
                        key={page.id}
                        className={cn(
                          'group relative flex min-w-0 items-center rounded-md',
                          page.id === activePageId && 'bg-primary/15',
                          dragId === page.id && 'opacity-40',
                          dropTarget?.id === page.id &&
                            dropTarget.mode === 'into' &&
                            'ring-1 ring-inset ring-primary/50',
                        )}
                        style={{ paddingLeft: `${4 + page.depth * 12}px` }}
                        onDragOver={(e) => {
                          e.preventDefault()
                          if (!dragId || dragId === page.id) return
                          const dropMode = modeFromEvent(e)
                          setDropTarget((prev) =>
                            prev?.id === page.id && prev.mode === dropMode
                              ? prev
                              : { id: page.id, mode: dropMode },
                          )
                        }}
                        onDragLeave={() => {
                          setDropTarget((prev) => (prev?.id === page.id ? null : prev))
                        }}
                        onDrop={(e) => {
                          e.preventDefault()
                          onPageDrop(page.id, modeFromEvent(e))
                        }}
                      >
                        {dropTarget?.id === page.id && dropTarget.mode === 'before' && (
                          <span className="pointer-events-none absolute inset-x-1 top-0 h-px bg-primary" />
                        )}
                        {dropTarget?.id === page.id && dropTarget.mode === 'after' && (
                          <span className="pointer-events-none absolute inset-x-1 bottom-0 h-px bg-primary" />
                        )}

                        {hasChildren ? (
                          <button
                            type="button"
                            className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10"
                            onClick={() =>
                              setCollapsed((prev) => ({
                                ...prev,
                                [page.id]: !prev[page.id],
                              }))
                            }
                          >
                            {isCollapsed ? (
                              <ChevronRight className="size-3.5" />
                            ) : (
                              <ChevronDown className="size-3.5" />
                            )}
                          </button>
                        ) : (
                          <span className="w-1.5 shrink-0" />
                        )}

                        <button
                          type="button"
                          className={cn(
                            'flex min-w-0 flex-1 items-center gap-1.5 py-[5px] pr-2 text-left text-[13px]',
                            page.id === activePageId
                              ? 'font-medium text-primary'
                              : 'text-sidebar-foreground/90',
                          )}
                          draggable
                          onDragStart={(e) => onPageDragStart(e, page.id)}
                          onDragEnd={() => {
                            setDragId(null)
                            setDropTarget(null)
                          }}
                          onClick={() => select(page.id)}
                        >
                          <span className="shrink-0 text-[13px] leading-none opacity-90">
                            {page.icon}
                          </span>
                          <span className="truncate">{page.title || 'Tanpa judul'}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>

              <section>
                <button
                  type="button"
                  className="flex h-7 w-full items-center gap-1.5 rounded-md px-2 text-[13px] text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                  onClick={() => setShowTrash((v) => !v)}
                >
                  <Trash2 className="size-3.5" />
                  Trash{trash.length ? ` (${trash.length})` : ''}
                </button>
                {showTrash && (
                  <ul className="mt-0.5">
                    {trash.length === 0 && (
                      <li className="px-2 py-1 text-[11px] text-muted-foreground">Kosong</li>
                    )}
                    {trash.map((page) => (
                      <li
                        key={`trash-${page.id}`}
                        className="flex items-center gap-0.5 rounded-md px-1"
                      >
                        <span className="min-w-0 flex-1 truncate px-1 text-[12px] text-muted-foreground">
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
          )}

          {mode === 'activity' && (
            <div className="px-1.5 pb-3 pt-1.5">
              {activitySummaries.length === 0 ? (
                <p className="px-2 py-2 text-[12px] leading-relaxed text-muted-foreground">
                  Belum ada aktivitas. Perubahan tugas dan halaman akan muncul di sini.
                </p>
              ) : (
                <ul className="flex flex-col gap-0.5">
                  {activitySummaries.slice(0, 12).map((ev) => (
                    <li
                      key={ev.id}
                      className="rounded-md px-2 py-1.5 text-[12px] leading-snug text-sidebar-foreground/90"
                    >
                      <div className="line-clamp-2">{ev.summary}</div>
                      <div className="mt-0.5 text-[10px] text-muted-foreground">
                        {new Date(ev.at).toLocaleString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  )
}

export function Sidebar(props: Props) {
  return (
    <>
      <aside className="hidden h-full md:flex md:flex-col">
        <SidebarBody {...props} />
      </aside>

      <Sheet open={props.mobileOpen} onOpenChange={(open) => !open && props.onCloseMobile()}>
        <SheetContent side="left" className="w-[min(19rem,92vw)] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigasi</SheetTitle>
          </SheetHeader>
          <SidebarBody {...props} />
        </SheetContent>
      </Sheet>
    </>
  )
}
