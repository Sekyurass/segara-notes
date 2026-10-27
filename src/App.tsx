import { useEffect, useMemo, useRef, useState } from 'react'
import { Lock, Menu, Share2 } from 'lucide-react'
import { Sidebar } from './components/Sidebar'
import { Editor } from './components/Editor'
import { CommandPalette } from './components/CommandPalette'
import { LockScreen } from './components/LockScreen'
import { ShareModal } from './components/ShareModal'
import { ShareView } from './components/ShareView'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import {
  fetchWorkspaceMeta,
  fetchWorkspaceRemote,
  pingApi,
  saveWorkspaceRemote,
  type SyncStatus,
} from './lib/api'
import { downloadMarkdown } from './lib/markdown'
import {
  activePages,
  collectDescendantIds,
  getBreadcrumb,
  nextOrder,
  pushRecent,
  reorderSiblingPages,
} from './lib/pages'
import { createId } from './lib/id'
import {
  hasWorkspaceLock,
  isUnlockedSession,
  lockSession,
} from './lib/lock'
import {
  createEmptyPage,
  loadWorkspace,
  normalizeWorkspace,
  saveWorkspace,
} from './lib/storage'
import type { Page, Workspace } from './types'

type Theme = 'light' | 'dark'

function readTheme(): Theme {
  const saved = localStorage.getItem('segara-notes:theme')
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function syncLabel(status: SyncStatus): string {
  switch (status) {
    case 'online':
      return 'Tersinkron'
    case 'saving':
      return 'Menyimpan…'
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
  const remoteStamp = useRef<string | null>(null)
  const savingLocal = useRef(false)

  const livePages = useMemo(() => activePages(workspace.pages), [workspace.pages])

  const activePage = useMemo(() => {
    const found = livePages.find((p) => p.id === workspace.activePageId)
    return found ?? livePages[0] ?? null
  }, [livePages, workspace.activePageId])

  const breadcrumb = useMemo(
    () => (activePage ? getBreadcrumb(workspace.pages, activePage.id) : []),
    [workspace.pages, activePage],
  )

  useEffect(() => {
    if (shareToken) return
    let cancelled = false

    async function boot() {
      const online = await pingApi()
      if (cancelled) return

      if (!online) {
        setSyncStatus('offline')
        setHydrated(true)
        return
      }

      const remote = await fetchWorkspaceRemote()
      if (cancelled) return

      if (remote && Array.isArray(remote.pages) && remote.pages.length > 0) {
        setWorkspace(normalizeWorkspace(remote))
        setSyncStatus('online')
        const meta = await fetchWorkspaceMeta()
        remoteStamp.current = meta?.updatedAt ?? null
      } else {
        const local = loadWorkspace()
        const ok = await saveWorkspaceRemote(local)
        if (!cancelled) setSyncStatus(ok ? 'online' : 'error')
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
        setSyncStatus('offline')
        savingLocal.current = false
        return
      }

      setSyncStatus('saving')
      const ok = await saveWorkspaceRemote(workspace)
      if (cancelled) return
      setSyncStatus(ok ? 'online' : 'error')
      if (ok) {
        const meta = await fetchWorkspaceMeta()
        remoteStamp.current = meta?.updatedAt ?? remoteStamp.current
      }
      savingLocal.current = false
    }, 700)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [workspace, hydrated, lockMode, shareToken])

  // Light poll: pull remote if another client updated
  useEffect(() => {
    if (shareToken || lockMode !== 'none') return
    const id = window.setInterval(async () => {
      if (document.hidden || savingLocal.current) return
      const meta = await fetchWorkspaceMeta()
      if (!meta?.updatedAt) return
      if (remoteStamp.current && meta.updatedAt !== remoteStamp.current) {
        const remote = await fetchWorkspaceRemote()
        if (remote) {
          setWorkspace(normalizeWorkspace(remote))
          remoteStamp.current = meta.updatedAt
          setSyncStatus('online')
        }
      } else if (!remoteStamp.current) {
        remoteStamp.current = meta.updatedAt
      }
    }, 8000)
    return () => window.clearInterval(id)
  }, [lockMode, shareToken])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('segara-notes:theme', theme)
  }, [theme])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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
      activePageId: id,
      recentPageIds: pushRecent(prev.recentPageIds ?? [], id),
      pages: prev.pages.map((p) => (p.id === id ? { ...p, updatedAt: Date.now() } : p)),
    }))
  }

  function patchActive(partial: Partial<Page>) {
    setWorkspace((prev) => ({
      ...prev,
      pages: prev.pages.map((page) => {
        if (page.id !== prev.activePageId) return page
        return {
          ...page,
          ...partial,
          updatedAt: Date.now(),
        }
      }),
    }))
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

  const syncVariant =
    syncStatus === 'online'
      ? 'default'
      : syncStatus === 'error'
        ? 'destructive'
        : 'secondary'

  return (
    <div className="app-shell">
      <Sidebar
        pages={workspace.pages}
        activePageId={activePage.id}
        theme={theme}
        mobileOpen={mobileNav}
        onCloseMobile={() => setMobileNav(false)}
        onSelect={openPage}
        onCreateRoot={createRootPage}
        onCreateChild={createChildPage}
        onSoftDelete={softDeletePage}
        onRestore={restorePage}
        onPurge={purgePage}
        onToggleFavorite={(id) =>
          setWorkspace((prev) => ({
            ...prev,
            pages: prev.pages.map((p) =>
              p.id === id ? { ...p, favorite: !p.favorite, updatedAt: Date.now() } : p,
            ),
          }))
        }
        onReorder={(fromId, toId) =>
          setWorkspace((prev) => ({
            ...prev,
            pages: reorderSiblingPages(prev.pages, fromId, toId),
          }))
        }
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        onOpenSearch={() => setPaletteOpen(true)}
      />

      <main className="flex min-w-0 flex-col bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,color-mix(in_oklch,var(--primary)_12%,transparent),transparent)]">
        <div className="flex items-center justify-between gap-3 border-b border-transparent px-3 py-2.5 sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="md:hidden"
              aria-label="Menu"
              onClick={() => setMobileNav(true)}
            >
              <Menu />
            </Button>
            <Badge variant="secondary" className="gap-1.5 font-normal">
              <Kbd>/</Kbd> blok
            </Badge>
            <Badge variant="secondary" className="hidden gap-1.5 font-normal sm:inline-flex">
              <Kbd>Ctrl+K</Kbd> cari
            </Badge>
            <Badge variant={syncVariant} className="font-normal">
              {syncLabel(syncStatus)}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setShareOpen(true)}>
              <Share2 /> Share
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                if (hasWorkspaceLock()) {
                  lockSession()
                  setLockMode('unlock')
                } else {
                  setLockMode('setup')
                }
              }}
            >
              <Lock />
              {hasWorkspaceLock() ? 'Kunci' : 'PIN'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => downloadMarkdown(activePage)}
            >
              Export .md
            </Button>
          </div>
        </div>
        <div className="editor-scroll">
          <Editor
            page={activePage}
            pages={livePages}
            breadcrumb={breadcrumb}
            onChangePage={(partial) => patchActive(partial)}
            onChangeBlocks={(blocks) => patchActive({ blocks })}
            onSelectPage={openPage}
            onCreateChild={createChildPage}
            onDuplicatePage={duplicateActivePage}
          />
        </div>
      </main>

      <CommandPalette
        open={paletteOpen}
        workspace={workspace}
        onClose={() => setPaletteOpen(false)}
        onSelect={openPage}
      />

      <ShareModal
        open={shareOpen}
        pageId={activePage.id}
        pageTitle={activePage.title}
        onClose={() => setShareOpen(false)}
      />
    </div>
  )
}
