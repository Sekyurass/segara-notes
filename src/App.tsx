import { useEffect, useMemo, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { Editor } from './components/Editor'
import {
  fetchWorkspaceRemote,
  pingApi,
  saveWorkspaceRemote,
  type SyncStatus,
} from './lib/api'
import { downloadMarkdown } from './lib/markdown'
import { createEmptyPage, loadWorkspace, saveWorkspace } from './lib/storage'
import { collectDescendantIds, getBreadcrumb } from './lib/pages'
import type { Block, Workspace } from './types'

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

  const activePage = useMemo(
    () => workspace.pages.find((p) => p.id === workspace.activePageId) ?? workspace.pages[0],
    [workspace],
  )

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
        setWorkspace(remote)
        saveWorkspace(remote)
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

  function patchActive(partial: Partial<{ title: string; blocks: Block[] }>) {
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
    const page = createEmptyPage()
    setWorkspace((prev) => ({
      ...prev,
      activePageId: page.id,
      pages: [page, ...prev.pages],
    }))
  }

  function createChildPage(parentId: string) {
    const page = createEmptyPage('Sub-halaman', parentId)
    setWorkspace((prev) => ({
      ...prev,
      activePageId: page.id,
      pages: [page, ...prev.pages],
    }))
  }

  function deletePage(id: string) {
    setWorkspace((prev) => {
      const removeIds = collectDescendantIds(prev.pages, id)
      if (removeIds.size >= prev.pages.length) return prev
      const pages = prev.pages.filter((p) => !removeIds.has(p.id))
      const activePageId = removeIds.has(prev.activePageId)
        ? pages[0].id
        : prev.activePageId
      return { ...prev, pages, activePageId }
    })
  }

  if (!activePage) return null

  return (
    <div className="app-shell">
      <Sidebar
        pages={workspace.pages}
        activePageId={activePage.id}
        theme={theme}
        onSelect={(id) => setWorkspace((prev) => ({ ...prev, activePageId: id }))}
        onCreateRoot={createRootPage}
        onCreateChild={createChildPage}
        onDelete={deletePage}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      />

      <main className="workspace">
        <div className="topbar">
          <div className="topbar-hints">
            <span className="hint-chip">
              <kbd>/</kbd> menu blok
            </span>
            <span className="hint-chip">
              <kbd>⋮⋮</kbd> seret urutan
            </span>
            <span className={`hint-chip sync-chip sync-${syncStatus}`} title="Status sinkronisasi API">
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
            breadcrumb={breadcrumb}
            onChangeTitle={(title) => patchActive({ title })}
            onChangeBlocks={(blocks) => patchActive({ blocks })}
            onSelectPage={(id) => setWorkspace((prev) => ({ ...prev, activePageId: id }))}
          />
        </div>
      </main>
    </div>
  )
}
