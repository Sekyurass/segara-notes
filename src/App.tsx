import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Download,
  Ellipsis,
  Lock,
  Menu,
  Redo2,
  Search,
  Settings2,
  Share2,
  Undo2,
  Upload,
} from 'lucide-react'
import { AppDialogHost } from './components/AppDialogHost'
import { Sidebar } from './components/Sidebar'
import { Editor } from './components/Editor'
import { CommandPalette } from './components/CommandPalette'
import { LockScreen } from './components/LockScreen'
import { ShareModal } from './components/ShareModal'
import { ShareView } from './components/ShareView'
import { SettingsPanel } from './components/SettingsPanel'
import { TasksView } from './components/TasksView'
import { HomeView } from './components/HomeView'
import { ActivityView } from './components/ActivityView'
import { MobileBottomNav } from './components/MobileBottomNav'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Kbd } from '@/components/ui/kbd'
import {
  fetchWorkspaceMeta,
  fetchWorkspaceRemote,
  pingApi,
  saveWorkspaceRemote,
  type SyncStatus,
} from './lib/api'
import {
  ensureNotificationPermission,
  notificationSupported,
  notifyDueTasks,
} from './lib/notifications'
import { connectRealtime, type PresencePeer, type RealtimeHandle } from './lib/realtime'
import { pushActivity } from './lib/activity'
import {
  clearOfflineQueue,
  enqueueOfflineWorkspace,
  hasOfflinePending,
  peekOfflineWorkspace,
} from './lib/offline'
import { mergeWorkspaces } from './lib/sync'
import {
  createProfile,
  getActiveProfile,
  getActiveProfileId,
  loadProfiles,
  setActiveProfileId,
  type UserProfile,
} from './lib/profiles'
import {
  clickupCreateTask,
  clickupFetchListOptions,
  clickupFetchListTasks,
  clickupPing,
  mapClickUpPriority,
  toClickUpPriority,
} from './lib/clickup'
import {
  emptyHistory,
  pushHistory,
  redoHistory,
  undoHistory,
  type HistoryState,
} from './lib/history'
import { downloadMarkdown } from './lib/markdown'
import {
  activePages,
  collectDescendantIds,
  dropPageOn,
  getBreadcrumb,
  nextOrder,
  pushRecent,
} from './lib/pages'
import { applyPrefs, loadPrefs, savePrefs, type AppPrefs } from './lib/prefs'
import { createId } from './lib/id'
import {
  hasWorkspaceLock,
  isUnlockedSession,
  lockSession,
} from './lib/lock'
import { PAGE_TEMPLATES } from './lib/templates'
import {
  createEmptyPage,
  exportWorkspaceJson,
  importWorkspaceJson,
  loadWorkspace,
  saveWorkspace,
} from './lib/storage'
import { askAlert, askConfirm, askPrompt } from './lib/appDialog'
import {
  createTask,
  createTaskFolder,
  createTaskList,
  createTaskSpace,
  deleteTaskList,
  isDoneStatus,
  tasksForPage,
} from './lib/tasks'
import type { Page, TaskDueFilter, Workspace } from './types'

type Theme = 'light' | 'dark'

function readTheme(): Theme {
  const saved = localStorage.getItem('segara-notes:theme')
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function syncLabel(status: SyncStatus, live: boolean, peers: number): string {
  switch (status) {
    case 'online':
      if (live && peers > 1) return `Live · ${peers}`
      if (live) return 'Live'
      return 'Tersinkron'
    case 'saving':
      return 'Menyimpan…'
    case 'pending':
      return 'Menunggu sync'
    case 'error':
      return 'Gagal sync'
    default:
      return 'Lokal saja'
  }
}

function readShareToken(): string | null {
  const params = new URLSearchParams(window.location.search)
  return params.get('share')
}

export default function App() {
  const shareToken = useMemo(() => readShareToken(), [])
  const [workspace, setWorkspace] = useState<Workspace>(() => loadWorkspace())
  const [theme, setTheme] = useState<Theme>(() => readTheme())
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline')
  const [hydrated, setHydrated] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [lockMode, setLockMode] = useState<'none' | 'unlock' | 'setup'>(() =>
    hasWorkspaceLock() && !isUnlockedSession() ? 'unlock' : 'none',
  )
  const [history, setHistory] = useState<HistoryState>(() => emptyHistory())
  const [prefs, setPrefs] = useState<AppPrefs>(() => loadPrefs())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null)
  const [focusDueFilter, setFocusDueFilter] = useState<TaskDueFilter | null>(null)
  const [liveConnected, setLiveConnected] = useState(false)
  const [livePeers, setLivePeers] = useState(0)
  const [presenceList, setPresenceList] = useState<PresencePeer[]>([])
  const [profiles] = useState<UserProfile[]>(() => loadProfiles())
  const [activeProfileId] = useState(() => getActiveProfileId())
  const remoteStamp = useRef<string | null>(null)
  const savingLocal = useRef(false)
  const skipHistory = useRef(false)
  const historyTimer = useRef<number | null>(null)
  const importRef = useRef<HTMLInputElement>(null)
  const realtimeRef = useRef<RealtimeHandle | null>(null)
  const workspaceRef = useRef(workspace)
  workspaceRef.current = workspace

  const livePages = useMemo(() => activePages(workspace.pages), [workspace.pages])

  const activePage = useMemo(() => {
    const found = livePages.find((p) => p.id === workspace.activePageId)
    return found ?? livePages[0] ?? null
  }, [livePages, workspace.activePageId])

  const breadcrumb = useMemo(
    () => (activePage ? getBreadcrumb(workspace.pages, activePage.id) : []),
    [workspace.pages, activePage],
  )

  /** Setiap sesi browser baru: land di Beranda (bukan catatan pertama). */
  useEffect(() => {
    const key = 'segara:land-home'
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
    } catch {
      /* ignore */
    }
    setWorkspace((prev) => ({ ...prev, mode: 'home' }))
  }, [])

  useEffect(() => {
    if (shareToken) return
    let cancelled = false

    async function boot() {
      const online = await pingApi()
      if (cancelled) return

      if (!online) {
        const pending = await hasOfflinePending()
        setSyncStatus(pending ? 'pending' : 'offline')
        setHydrated(true)
        return
      }

      const queued = (await hasOfflinePending()) ? await peekOfflineWorkspace() : null
      const remote = await fetchWorkspaceRemote()
      if (cancelled) return

      if (remote && Array.isArray(remote.pages) && remote.pages.length > 0) {
        const local = queued ?? loadWorkspace()
        const merged = mergeWorkspaces(local, remote)
        setWorkspace(merged)
        const ok = await saveWorkspaceRemote(merged)
        if (ok) await clearOfflineQueue()
        setSyncStatus(ok ? 'online' : 'error')
        const meta = await fetchWorkspaceMeta()
        remoteStamp.current = meta?.updatedAt ?? null
      } else {
        const local = queued ?? loadWorkspace()
        const ok = await saveWorkspaceRemote(local)
        if (ok) await clearOfflineQueue()
        if (!cancelled) {
          setWorkspace(local)
          setSyncStatus(ok ? 'online' : 'error')
        }
      }

      if (!cancelled) setHydrated(true)
    }

    void boot()
    return () => {
      cancelled = true
    }
  }, [shareToken])

  useEffect(() => {
    if (shareToken || !hydrated || lockMode !== 'none') return
    saveWorkspace(workspace)
    savingLocal.current = true

    let cancelled = false
    const timer = window.setTimeout(async () => {
      const online = await pingApi()
      if (cancelled) return
      if (!online) {
        await enqueueOfflineWorkspace(workspace)
        setSyncStatus('pending')
        savingLocal.current = false
        return
      }

      setSyncStatus('saving')
      const ok = await saveWorkspaceRemote(workspace)
      if (cancelled) return
      if (ok) {
        await clearOfflineQueue()
        const meta = await fetchWorkspaceMeta()
        remoteStamp.current = meta?.updatedAt ?? remoteStamp.current
        setSyncStatus('online')
      } else {
        await enqueueOfflineWorkspace(workspace)
        setSyncStatus('pending')
      }
      savingLocal.current = false
    }, 700)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [workspace, hydrated, lockMode, shareToken])

  async function pullRemoteIfNewer(updatedAt?: string) {
    if (savingLocal.current) return
    const stamp = updatedAt ?? (await fetchWorkspaceMeta())?.updatedAt
    if (!stamp) return
    if (remoteStamp.current && stamp === remoteStamp.current) return
    const remote = await fetchWorkspaceRemote()
    if (!remote) return
    skipHistory.current = true
    setWorkspace((local) => mergeWorkspaces(local, remote))
    remoteStamp.current = stamp
    setSyncStatus('online')
  }

  // WebSocket live sync (+ poll cadangan saat WS putus)
  useEffect(() => {
    if (shareToken || lockMode !== 'none' || !hydrated) return

    let wsOk = false
    const rt = connectRealtime({
      onConnected: (ok) => {
        wsOk = ok
        setLiveConnected(ok)
      },
      onPresence: (count, list) => {
        setLivePeers(count)
        setPresenceList(list)
      },
      onWorkspaceUpdated: (updatedAt) => {
        void pullRemoteIfNewer(updatedAt)
      },
    })
    realtimeRef.current = rt
    const profile = getActiveProfile()
    rt.setPresence({
      name: workspaceRef.current.displayName || profile.name,
      pageId: workspaceRef.current.activePageId,
      color: profile.color,
    })

    const poll = window.setInterval(() => {
      if (document.hidden || savingLocal.current || wsOk) return
      void pullRemoteIfNewer()
    }, 20_000)

    return () => {
      realtimeRef.current = null
      rt.disconnect()
      window.clearInterval(poll)
    }
  }, [lockMode, shareToken, hydrated, activeProfileId])

  useEffect(() => {
    if (!realtimeRef.current) return
    const profile = getActiveProfile()
    realtimeRef.current.setPresence({
      name: workspace.displayName || profile.name,
      pageId: workspace.mode === 'notes' ? workspace.activePageId : null,
      color: profile.color,
    })
  }, [workspace.activePageId, workspace.displayName, workspace.mode, activeProfileId])

  // Notifikasi OS untuk due / overdue
  useEffect(() => {
    if (shareToken || lockMode !== 'none' || !hydrated || !prefs.notifyDue) return
    if (!notificationSupported()) return

    let cancelled = false

    async function tick() {
      if (cancelled || document.hidden) return
      const perm = await ensureNotificationPermission()
      if (cancelled || perm !== 'granted') return
      notifyDueTasks(workspaceRef.current)
    }

    void tick()
    const id = window.setInterval(() => void tick(), 60_000)
    const onVis = () => {
      if (document.visibilityState === 'visible') void tick()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelled = true
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [shareToken, lockMode, hydrated, prefs.notifyDue])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('segara-notes:theme', theme)
    applyPrefs(prefs)
  }, [theme, prefs])

  useEffect(() => {
    savePrefs(prefs)
  }, [prefs])

  const prevWorkspace = useRef(workspace)
  useEffect(() => {
    if (shareToken || lockMode !== 'none') {
      prevWorkspace.current = workspace
      return
    }
    if (skipHistory.current) {
      skipHistory.current = false
      prevWorkspace.current = workspace
      return
    }
    const snapshot = prevWorkspace.current
    if (historyTimer.current) window.clearTimeout(historyTimer.current)
    historyTimer.current = window.setTimeout(() => {
      setHistory((prev) => pushHistory(prev, snapshot))
    }, 450)
    prevWorkspace.current = workspace
    return () => {
      if (historyTimer.current) window.clearTimeout(historyTimer.current)
    }
  }, [workspace, shareToken, lockMode])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(true)
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault()
        setHistory((prev) => {
          const result = undoHistory(prev, workspace)
          if (!result) return prev
          skipHistory.current = true
          setWorkspace(result.next)
          return result.history
        })
        return
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))
      ) {
        e.preventDefault()
        setHistory((prev) => {
          const result = redoHistory(prev, workspace)
          if (!result) return prev
          skipHistory.current = true
          setWorkspace(result.next)
          return result.history
        })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [workspace])

  if (shareToken) {
    return <ShareView token={shareToken} />
  }

  if (lockMode !== 'none') {
    return (
      <LockScreen
        mode={lockMode === 'setup' ? 'setup' : 'unlock'}
        onUnlocked={() => setLockMode('none')}
      />
    )
  }

  function openPage(id: string) {
    setWorkspace((prev) => ({
      ...prev,
      mode: 'notes',
      activePageId: id,
      recentPageIds: pushRecent(prev.recentPageIds ?? [], id),
      pages: prev.pages.map((p) => (p.id === id ? { ...p, updatedAt: Date.now() } : p)),
    }))
  }

  function patchWorkspace(partial: Partial<Workspace>) {
    setWorkspace((prev) => {
      let next: Workspace = {
        ...prev,
        ...partial,
        revision: (prev.revision ?? 0) + 1,
      }
      if (partial.tasks) {
        const before = new Map(prev.tasks.map((t) => [t.id, t]))
        const after = new Map(partial.tasks.map((t) => [t.id, t]))
        for (const [id, task] of after) {
          const old = before.get(id)
          if (!old) {
            next = pushActivity(next, {
              kind: 'task',
              summary: `Buat tugas · ${task.title || 'Tanpa judul'}`,
              taskId: id,
              pageId: task.pageId,
            })
          } else if (
            old.statusId !== task.statusId &&
            isDoneStatus(prev.taskStatuses, task.statusId) &&
            !isDoneStatus(prev.taskStatuses, old.statusId)
          ) {
            next = pushActivity(next, {
              kind: 'task',
              summary: `Selesai · ${task.title || 'Tanpa judul'}`,
              taskId: id,
              pageId: task.pageId,
            })
          } else if (
            old.statusId !== task.statusId &&
            !isDoneStatus(prev.taskStatuses, task.statusId) &&
            isDoneStatus(prev.taskStatuses, old.statusId)
          ) {
            next = pushActivity(next, {
              kind: 'task',
              summary: `Buka lagi · ${task.title || 'Tanpa judul'}`,
              taskId: id,
              pageId: task.pageId,
            })
          }
        }
        for (const [id, task] of before) {
          if (!after.has(id)) {
            next = pushActivity(next, {
              kind: 'task',
              summary: `Hapus tugas · ${task.title || 'Tanpa judul'}`,
              taskId: id,
              pageId: task.pageId,
            })
          }
        }
      }
      return next
    })
  }

  function switchProfile(id: string) {
    saveWorkspace(workspace)
    setActiveProfileId(id)
    window.location.reload()
  }

  function handleCreateProfile(name: string) {
    saveWorkspace(workspace)
    createProfile(name)
    window.location.reload()
  }

  function resolveClickUpStatusId(clickUpStatus?: string): string | undefined {
    const key = String(clickUpStatus ?? '')
      .trim()
      .toLowerCase()
    if (key && prefs.clickupMap.statusByClickUp[key]) {
      return prefs.clickupMap.statusByClickUp[key]
    }
    const byName = workspace.taskStatuses.find(
      (s) => s.name.trim().toLowerCase() === key,
    )
    if (byName) return byName.id
    return (
      workspace.taskStatuses.find((s) => s.category === 'open')?.id ??
      workspace.taskStatuses[0]?.id
    )
  }

  function clickUpStatusNameForLocal(statusId: string): string | undefined {
    const entry = Object.entries(prefs.clickupMap.statusByClickUp).find(
      ([, id]) => id === statusId,
    )
    if (entry) return entry[0]
    return workspace.taskStatuses.find((s) => s.id === statusId)?.name
  }

  async function handleClickupImport(): Promise<number> {
    if (!prefs.clickupToken || !prefs.clickupListId) return -1
    try {
      const remoteTasks = await clickupFetchListTasks(prefs.clickupToken, prefs.clickupListId)
      const listId = workspace.activeTaskListId || workspace.taskLists[0]?.id
      const fallbackStatus =
        workspace.taskStatuses.find((s) => s.category === 'open')?.id ??
        workspace.taskStatuses[0]?.id
      if (!listId || !fallbackStatus) return -1
      const map = prefs.clickupMap
      const imported = remoteTasks.map((t) =>
        createTask({
          listId,
          statusId: resolveClickUpStatusId(t.status?.status) ?? fallbackStatus,
          title: t.name,
          description: t.description ?? '',
          priority: map.priority ? mapClickUpPriority(t.priority) : 'none',
          dueDate:
            map.due && t.due_date
              ? new Date(Number(t.due_date)).toISOString().slice(0, 10)
              : null,
          tags: (t.tags ?? []).map((x) => x.name),
          assignee: t.assignees?.[0]?.username ?? null,
        }),
      )
      setWorkspace((prev) =>
        pushActivity(
          {
            ...prev,
            tasks: [...imported, ...prev.tasks],
            mode: 'tasks',
          },
          { kind: 'import', summary: `Impor ${imported.length} task dari ClickUp` },
        ),
      )
      return imported.length
    } catch {
      return -1
    }
  }

  async function handleClickupExport(): Promise<number> {
    if (!prefs.clickupToken || !prefs.clickupListId) return -1
    const listId = workspace.activeTaskListId
    const toExport = workspace.tasks.filter(
      (t) => !t.parentTaskId && t.listId === listId,
    )
    if (!toExport.length) return 0
    const map = prefs.clickupMap
    let ok = 0
    try {
      for (const t of toExport.slice(0, 40)) {
        await clickupCreateTask(prefs.clickupToken, prefs.clickupListId, {
          name: t.title || 'Tanpa judul',
          description: t.description || undefined,
          due_date:
            map.due && t.dueDate
              ? new Date(`${t.dueDate}T12:00:00`).getTime()
              : null,
          priority: map.priority ? toClickUpPriority(t.priority) : null,
          tags: t.tags.length ? t.tags : undefined,
          status: clickUpStatusNameForLocal(t.statusId),
        })
        ok += 1
      }
      setWorkspace((prev) =>
        pushActivity(prev, {
          kind: 'import',
          summary: `Ekspor ${ok} task ke ClickUp`,
        }),
      )
      return ok
    } catch {
      return ok > 0 ? ok : -1
    }
  }

  /** Promote & linked create: tetap di notes, tautkan pageId (satu perilaku). */
  function createTaskFromPage(pageId: string, title?: string) {
    const listId = workspace.activeTaskListId || workspace.taskLists[0]?.id
    const statusId =
      workspace.taskStatuses.find((s) => s.category === 'open')?.id ?? workspace.taskStatuses[0]?.id
    if (!listId || !statusId) return
    const page = workspace.pages.find((p) => p.id === pageId)
    const task = createTask({
      listId,
      statusId,
      title: title || page?.title || 'Tugas dari catatan',
      pageId,
      priority: 'normal',
    })
    setWorkspace((prev) =>
      pushActivity(
        {
          ...prev,
          tasks: [task, ...prev.tasks],
          revision: (prev.revision ?? 0) + 1,
        },
        {
          kind: 'task',
          summary: `Buat tugas · ${task.title}`,
          taskId: task.id,
          pageId,
        },
      ),
    )
  }

  function openTasksWithDue(due: TaskDueFilter = 'today') {
    setFocusDueFilter(due)
    setWorkspace((prev) => ({ ...prev, mode: 'tasks', taskView: 'list' }))
  }

  function unlinkTask(taskId: string) {
    setWorkspace((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId ? { ...t, pageId: null, updatedAt: Date.now() } : t,
      ),
    }))
  }

  function openTasksMode() {
    setWorkspace((prev) => ({ ...prev, mode: 'tasks' }))
  }

  function patchActive(partial: Partial<Page>) {
    setWorkspace((prev) => {
      const pages = prev.pages.map((page) => {
        if (page.id !== prev.activePageId) return page
        return {
          ...page,
          ...partial,
          updatedAt: Date.now(),
        }
      })
      let next: Workspace = { ...prev, pages, revision: (prev.revision ?? 0) + 1 }
      if (partial.comments) {
        next = pushActivity(next, {
          kind: 'comment',
          summary: 'Komentar diperbarui',
          pageId: prev.activePageId,
        })
      } else if (partial.title !== undefined && !partial.blocks) {
        next = pushActivity(next, {
          kind: 'page',
          summary: `Ganti judul · ${partial.title || 'Tanpa judul'}`,
          pageId: prev.activePageId,
        })
      }
      return next
    })
  }

  function createRootPage() {
    const page = createEmptyPage('Halaman tanpa judul', null, nextOrder(workspace.pages, null))
    setWorkspace((prev) => ({
      ...prev,
      activePageId: page.id,
      pages: [page, ...prev.pages],
      recentPageIds: pushRecent(prev.recentPageIds ?? [], page.id),
    }))
  }

  function createFromTemplate(templateId: string) {
    const tpl = PAGE_TEMPLATES.find((t) => t.id === templateId) ?? PAGE_TEMPLATES[0]
    const page = tpl.build(null)
    page.order = nextOrder(workspace.pages, null)
    setWorkspace((prev) => ({
      ...prev,
      activePageId: page.id,
      pages: [page, ...prev.pages],
      recentPageIds: pushRecent(prev.recentPageIds ?? [], page.id),
    }))
  }

  function createChildPage(parentId: string) {
    const page = createEmptyPage('Sub-halaman', parentId, nextOrder(workspace.pages, parentId))
    setWorkspace((prev) => ({
      ...prev,
      activePageId: page.id,
      pages: [page, ...prev.pages],
      recentPageIds: pushRecent(prev.recentPageIds ?? [], page.id),
    }))
  }

  function duplicateActivePage() {
    if (!activePage) return
    const copy: Page = {
      ...activePage,
      id: createId('page'),
      title: `${activePage.title || 'Tanpa judul'} (salinan)`,
      favorite: false,
      deletedAt: null,
      order: nextOrder(workspace.pages, activePage.parentId),
      updatedAt: Date.now(),
      blocks: activePage.blocks.map((b) => ({ ...b, id: createId('block') })),
    }
    setWorkspace((prev) => ({
      ...prev,
      activePageId: copy.id,
      pages: [copy, ...prev.pages],
      recentPageIds: pushRecent(prev.recentPageIds ?? [], copy.id),
    }))
  }

  function softDeletePage(id: string) {
    setWorkspace((prev) => {
      const removeIds = collectDescendantIds(prev.pages, id)
      const liveCount = prev.pages.filter((p) => !p.deletedAt && !removeIds.has(p.id)).length
      if (liveCount < 1) return prev
      const now = Date.now()
      const pages = prev.pages.map((p) =>
        removeIds.has(p.id) ? { ...p, deletedAt: now, favorite: false } : p,
      )
      const live = pages.filter((p) => !p.deletedAt)
      const activePageId = removeIds.has(prev.activePageId) ? live[0].id : prev.activePageId
      return { ...prev, pages, activePageId }
    })
  }

  function restorePage(id: string) {
    setWorkspace((prev) => ({
      ...prev,
      pages: prev.pages.map((p) => (p.id === id ? { ...p, deletedAt: null } : p)),
      activePageId: id,
    }))
  }

  function purgePage(id: string) {
    setWorkspace((prev) => {
      const removeIds = collectDescendantIds(prev.pages, id)
      return {
        ...prev,
        pages: prev.pages.filter((p) => !removeIds.has(p.id)),
      }
    })
  }

  if (!activePage) return null

  return (
    <div className="app-shell">
      <AppDialogHost />
      <Sidebar
        pages={workspace.pages}
        activePageId={activePage.id}
        theme={theme}
        mode={workspace.mode}
        taskLists={workspace.taskLists}
        taskSpaces={workspace.taskSpaces}
        taskFolders={workspace.taskFolders}
        activeTaskListId={workspace.activeTaskListId}
        activitySummaries={(workspace.activity ?? []).map((e) => ({
          id: e.id,
          summary: e.summary,
          at: e.at,
        }))}
        mobileOpen={mobileNav}
        onCloseMobile={() => setMobileNav(false)}
        onSelect={openPage}
        onSetMode={(mode) => patchWorkspace({ mode })}
        onOpenToday={() => openTasksWithDue('today')}
        onSelectTaskList={(id) => patchWorkspace({ activeTaskListId: id, mode: 'tasks' })}
        onCreateTaskSpace={async () => {
          const name = await askPrompt('Nama space baru', 'Space', {
            placeholder: 'Contoh: Product',
            confirmLabel: 'Buat',
          })
          if (!name) return
          const space = createTaskSpace(name, workspace.taskSpaces.length)
          const folder = createTaskFolder(space.id, 'General', 0)
          const list = createTaskList({
            name: 'Inbox',
            icon: '📥',
            folderId: folder.id,
            order: 0,
          })
          patchWorkspace({
            taskSpaces: [...workspace.taskSpaces, space],
            taskFolders: [...workspace.taskFolders, folder],
            taskLists: [...workspace.taskLists, list],
            activeTaskListId: list.id,
            mode: 'tasks',
          })
        }}
        onRenameTaskSpace={async (id) => {
          const space = workspace.taskSpaces.find((s) => s.id === id)
          if (!space) return
          const name = await askPrompt('Ganti nama space', space.name, {
            confirmLabel: 'Simpan',
          })
          if (!name) return
          patchWorkspace({
            taskSpaces: workspace.taskSpaces.map((s) =>
              s.id === id ? { ...s, name } : s,
            ),
          })
        }}
        onDeleteTaskSpace={async (id) => {
          if (workspace.taskSpaces.length <= 1) {
            await askAlert('Tidak bisa dihapus', {
              description: 'Minimal satu space harus tersisa.',
            })
            return
          }
          const ok = await askConfirm('Hapus space?', {
            description: 'Folder, list, dan tugas di dalamnya ikut terhapus.',
            confirmLabel: 'Hapus',
            destructive: true,
          })
          if (!ok) return
          const folderIds = new Set(
            workspace.taskFolders.filter((f) => f.spaceId === id).map((f) => f.id),
          )
          const listIds = new Set(
            workspace.taskLists
              .filter((l) => l.folderId && folderIds.has(l.folderId))
              .map((l) => l.id),
          )
          const taskLists = workspace.taskLists.filter((l) => !listIds.has(l.id))
          patchWorkspace({
            taskSpaces: workspace.taskSpaces.filter((s) => s.id !== id),
            taskFolders: workspace.taskFolders.filter((f) => f.spaceId !== id),
            taskLists,
            tasks: workspace.tasks.filter((t) => !listIds.has(t.listId)),
            activeTaskListId: listIds.has(workspace.activeTaskListId)
              ? (taskLists[0]?.id ?? '')
              : workspace.activeTaskListId,
          })
        }}
        onCreateTaskFolder={async (spaceId) => {
          const name = await askPrompt('Nama folder baru', 'Folder', {
            confirmLabel: 'Buat',
          })
          if (!name) return
          const folder = createTaskFolder(
            spaceId,
            name,
            workspace.taskFolders.filter((f) => f.spaceId === spaceId).length,
          )
          patchWorkspace({ taskFolders: [...workspace.taskFolders, folder] })
        }}
        onRenameTaskFolder={async (id) => {
          const folder = workspace.taskFolders.find((f) => f.id === id)
          if (!folder) return
          const name = await askPrompt('Ganti nama folder', folder.name)
          if (!name) return
          patchWorkspace({
            taskFolders: workspace.taskFolders.map((f) =>
              f.id === id ? { ...f, name } : f,
            ),
          })
        }}
        onDeleteTaskFolder={async (id) => {
          const foldersInSpace = workspace.taskFolders.filter(
            (f) =>
              f.spaceId === workspace.taskFolders.find((x) => x.id === id)?.spaceId,
          )
          if (foldersInSpace.length <= 1) {
            await askAlert('Tidak bisa dihapus', {
              description: 'Minimal satu folder per space.',
            })
            return
          }
          const ok = await askConfirm('Hapus folder?', {
            description: 'List dan tugas di dalamnya ikut terhapus.',
            confirmLabel: 'Hapus',
            destructive: true,
          })
          if (!ok) return
          const listIds = new Set(
            workspace.taskLists.filter((l) => l.folderId === id).map((l) => l.id),
          )
          const taskLists = workspace.taskLists.filter((l) => l.folderId !== id)
          patchWorkspace({
            taskFolders: workspace.taskFolders.filter((f) => f.id !== id),
            taskLists,
            tasks: workspace.tasks.filter((t) => !listIds.has(t.listId)),
            activeTaskListId: listIds.has(workspace.activeTaskListId)
              ? (taskLists[0]?.id ?? '')
              : workspace.activeTaskListId,
          })
        }}
        onCreateTaskList={async (folderId) => {
          const name = await askPrompt('Nama list baru', 'List', {
            confirmLabel: 'Buat',
          })
          if (!name) return
          const next = createTaskList({
            name,
            icon: '📋',
            folderId,
            order: workspace.taskLists.length,
          })
          patchWorkspace({
            taskLists: [...workspace.taskLists, next],
            activeTaskListId: next.id,
            mode: 'tasks',
          })
        }}
        onRenameTaskList={async (id) => {
          const list = workspace.taskLists.find((l) => l.id === id)
          if (!list) return
          const name = await askPrompt('Ganti nama list', list.name)
          if (!name) return
          patchWorkspace({
            taskLists: workspace.taskLists.map((l) =>
              l.id === id ? { ...l, name } : l,
            ),
          })
        }}
        onDeleteTaskList={async (id) => {
          if (workspace.taskLists.length <= 1) {
            await askAlert('Tidak bisa dihapus', {
              description: 'Minimal satu list harus tersisa.',
            })
            return
          }
          const ok = await askConfirm('Hapus list?', {
            description: 'Semua tugas di list ini ikut terhapus.',
            confirmLabel: 'Hapus',
            destructive: true,
          })
          if (!ok) return
          patchWorkspace(deleteTaskList(workspace, id))
        }}
        onChangeTaskListIcon={async (id) => {
          const list = workspace.taskLists.find((l) => l.id === id)
          if (!list) return
          const icon = await askPrompt('Ikon list', list.icon, {
            description: 'Masukkan satu emoji.',
            placeholder: '📋',
            confirmLabel: 'Simpan',
          })
          if (!icon) return
          patchWorkspace({
            taskLists: workspace.taskLists.map((l) =>
              l.id === id ? { ...l, icon } : l,
            ),
          })
        }}
        onCreateRoot={createRootPage}
        onRestore={restorePage}
        onPurge={purgePage}
        onReorder={(fromId, toId, mode) =>
          setWorkspace((prev) => ({
            ...prev,
            pages: dropPageOn(prev.pages, fromId, toId, mode),
          }))
        }
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        onOpenSearch={() => setPaletteOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-background">
        <div className="app-topbar">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="md:hidden"
              aria-label="Menu"
              onClick={() => setMobileNav(true)}
            >
              <Menu />
            </Button>
            <button
              type="button"
              className="hidden h-8 min-w-0 max-w-md flex-1 items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 text-left text-[12px] text-muted-foreground transition-colors hover:border-border hover:bg-muted/70 sm:inline-flex"
              onClick={() => setPaletteOpen(true)}
            >
              <Search className="size-3.5 shrink-0 opacity-70" />
              <span className="min-w-0 flex-1 truncate">Search</span>
              <Kbd className="h-5 shrink-0">Ctrl+K</Kbd>
            </button>
            <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground sm:ml-2">
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  syncStatus === 'online'
                    ? 'bg-emerald-500'
                    : syncStatus === 'error'
                      ? 'bg-destructive'
                      : syncStatus === 'saving' || syncStatus === 'pending'
                        ? 'bg-amber-500'
                        : 'bg-muted-foreground/50',
                )}
              />
              <span className="hidden sm:inline">
                {syncLabel(syncStatus, liveConnected, livePeers)}
              </span>
            </span>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              title="Undo (Ctrl+Z)"
              onClick={() => {
                const result = undoHistory(history, workspace)
                if (!result) return
                skipHistory.current = true
                setWorkspace(result.next)
                setHistory(result.history)
              }}
            >
              <Undo2 />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              title="Redo (Ctrl+Y)"
              onClick={() => {
                const result = redoHistory(history, workspace)
                if (!result) return
                skipHistory.current = true
                setWorkspace(result.next)
                setHistory(result.history)
              }}
            >
              <Redo2 />
            </Button>
            {workspace.mode === 'notes' && (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                title="Share halaman"
                onClick={() => setShareOpen(true)}
              >
                <Share2 />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon-xs">
                  <Ellipsis />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => {
                    if (hasWorkspaceLock()) {
                      lockSession()
                      setLockMode('unlock')
                    } else {
                      setLockMode('setup')
                    }
                  }}
                >
                  <Lock /> {hasWorkspaceLock() ? 'Kunci workspace' : 'Atur PIN'}
                </DropdownMenuItem>
                {workspace.mode === 'notes' && (
                  <DropdownMenuItem onClick={() => downloadMarkdown(activePage)}>
                    <Download /> Export Markdown
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => exportWorkspaceJson(workspace)}>
                  <Download /> Backup JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => importRef.current?.click()}>
                  <Upload /> Import JSON
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                  <Settings2 /> Kustomisasi & ClickUp
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <input
              ref={importRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (!file) return
                void importWorkspaceJson(file).then((ws) => {
                  skipHistory.current = true
                  setHistory(emptyHistory())
                  setWorkspace(ws)
                })
              }}
            />
          </div>
        </div>
        <div
          className={cn(
            workspace.mode === 'notes' ? 'editor-scroll' : 'view-scroll',
            'pb-16 md:pb-0',
          )}
        >
          {workspace.mode === 'home' ? (
            <HomeView
              workspace={workspace}
              onOpenNotes={() => patchWorkspace({ mode: 'notes' })}
              onOpenActivity={() => patchWorkspace({ mode: 'activity' })}
              onOpenPage={openPage}
              onOpenTasks={(opts) => {
                if (opts?.due && opts.due !== 'all') {
                  openTasksWithDue(opts.due)
                  if (opts.listId) {
                    patchWorkspace({ activeTaskListId: opts.listId })
                  }
                  return
                }
                patchWorkspace({
                  mode: 'tasks',
                  taskView: 'list',
                  ...(opts?.listId ? { activeTaskListId: opts.listId } : {}),
                })
              }}
              onOpenTask={(taskId) => {
                const task = workspace.tasks.find((t) => t.id === taskId)
                setWorkspace((prev) => ({
                  ...prev,
                  mode: 'tasks',
                  taskView: 'list',
                  activeTaskListId: task?.listId ?? prev.activeTaskListId,
                }))
                setFocusTaskId(taskId)
              }}
            />
          ) : workspace.mode === 'tasks' ? (
            <TasksView
              workspace={workspace}
              pages={livePages}
              onPatch={patchWorkspace}
              onOpenPage={openPage}
              focusTaskId={focusTaskId}
              onFocusTaskConsumed={() => setFocusTaskId(null)}
              focusDueFilter={focusDueFilter}
              onFocusDueConsumed={() => setFocusDueFilter(null)}
            />
          ) : workspace.mode === 'activity' ? (
            <ActivityView
              workspace={workspace}
              onOpenPage={openPage}
              onOpenTask={(taskId) => {
                const task = workspace.tasks.find((t) => t.id === taskId)
                setWorkspace((prev) => ({
                  ...prev,
                  mode: 'tasks',
                  activeTaskListId: task?.listId ?? prev.activeTaskListId,
                }))
                setFocusTaskId(taskId)
              }}
            />
          ) : activePage ? (
            <Editor
              page={activePage}
              pages={livePages}
              breadcrumb={breadcrumb}
              linkedTasks={tasksForPage(workspace, activePage.id)}
              allTasks={workspace.tasks}
              taskStatuses={workspace.taskStatuses}
              authorName={workspace.displayName}
              presencePeers={presenceList}
              onChangePage={(partial) => patchActive(partial)}
              onChangeBlocks={(blocks) => patchActive({ blocks })}
              onSelectPage={openPage}
              onCreateChild={createChildPage}
              onDuplicatePage={duplicateActivePage}
              onSoftDelete={() => softDeletePage(activePage.id)}
              onPromoteToTask={(title) => createTaskFromPage(activePage.id, title)}
              onCreateLinkedTask={() => createTaskFromPage(activePage.id)}
              onUnlinkTask={unlinkTask}
              onOpenTask={(taskId) => {
                const task = workspace.tasks.find((t) => t.id === taskId)
                setWorkspace((prev) => ({
                  ...prev,
                  mode: 'tasks',
                  taskView: 'list',
                  activeTaskListId: task?.listId ?? prev.activeTaskListId,
                }))
                setFocusTaskId(taskId)
              }}
              onOpenTasks={openTasksMode}
            />
          ) : null}
        </div>
      </main>

      <MobileBottomNav
        mode={workspace.mode}
        onSetMode={(mode) => patchWorkspace({ mode })}
      />

      <CommandPalette
        open={paletteOpen}
        workspace={workspace}
        onClose={() => setPaletteOpen(false)}
        onSelect={openPage}
        onSelectTask={(taskId) => {
          const task = workspace.tasks.find((t) => t.id === taskId)
          setWorkspace((prev) => ({
            ...prev,
            mode: 'tasks',
            activeTaskListId: task?.listId ?? prev.activeTaskListId,
          }))
          setFocusTaskId(taskId)
        }}
        onCreateBlank={createRootPage}
        onCreateFromTemplate={createFromTemplate}
      />

      <ShareModal
        open={shareOpen}
        pageId={activePage.id}
        pageTitle={activePage.title}
        onClose={() => setShareOpen(false)}
      />

      <SettingsPanel
        open={settingsOpen}
        prefs={prefs}
        taskStatuses={workspace.taskStatuses}
        displayName={workspace.displayName}
        profiles={profiles}
        activeProfileId={activeProfileId}
        onClose={() => setSettingsOpen(false)}
        onChange={setPrefs}
        onChangeStatuses={(taskStatuses) => patchWorkspace({ taskStatuses })}
        onDisplayName={(name) => patchWorkspace({ displayName: name })}
        onCreateProfile={handleCreateProfile}
        onSwitchProfile={switchProfile}
        onClickupPing={() => clickupPing(prefs.clickupToken)}
        onClickupImport={handleClickupImport}
        onClickupExport={handleClickupExport}
        onClickupLoadLists={() => clickupFetchListOptions(prefs.clickupToken)}
      />
    </div>
  )
}
