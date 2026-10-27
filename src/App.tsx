import { useEffect, useMemo, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { Editor } from './components/Editor'
import { CommandPalette } from './components/CommandPalette'
import {
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

export default function App() {
  const [workspace, setWorkspace] = useState<Workspace>(() => loadWorkspace())
  const [theme, setTheme] = useState<Theme>(() => readTheme())
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline')
  const [hydrated, setHydrated] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)

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
  }, [])

  useEffect(() => {
    if (!hydrated) return
    saveWorkspace(workspace)

    let cancelled = false
    const timer = window.setTimeout(async () => {
      const online = await pingApi()
      if (cancelled) return
      if (!online) {
        setSyncStatus('offline')
        return
      }

      setSyncStatus('saving')
      const ok = await saveWorkspaceRemote(workspace)
      if (cancelled) return
      setSyncStatus(ok ? 'online' : 'error')
    }, 700)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [workspace, hydrated])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
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

  function openPage(id: string) {
    setWorkspace((prev) => ({
      ...prev,
      activePageId: id,
      recentPageIds: pushRecent(prev.recentPageIds ?? [], id),
      pages: prev.pages.map((p) =>
        p.id === id ? { ...p, updatedAt: Date.now() } : p,
      ),
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

      <main className="workspace">
        <div className="topbar">
          <div className="topbar-hints">
            <button
              type="button"
              className="icon-btn mobile-nav-btn"
              aria-label="Menu"
              onClick={() => setMobileNav(true)}
            >
              ☰
            </button>
            <span className="hint-chip">
              <kbd>/</kbd> blok
            </span>
            <span className="hint-chip hide-sm">
              <kbd>Ctrl+K</kbd> cari
            </span>
            <span className={`hint-chip sync-chip sync-${syncStatus}`} title="Status sync">
              {syncLabel(syncStatus)}
            </span>
          </div>
          <button
            type="button"
            className="btn-ghost topbar-export"
            onClick={() => downloadMarkdown(activePage)}
          >
            Export .md
          </button>
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
    </div>
  )
}
