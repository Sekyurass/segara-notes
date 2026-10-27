import { useEffect, useMemo, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { Editor } from './components/Editor'
import { createEmptyPage, loadWorkspace, saveWorkspace } from './lib/storage'
import { collectDescendantIds, getBreadcrumb } from './lib/pages'
import type { Block, Workspace } from './types'

type Theme = 'light' | 'dark'

function readTheme(): Theme {
  const saved = localStorage.getItem('segara-notes:theme')
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function App() {
  const [workspace, setWorkspace] = useState<Workspace>(() => loadWorkspace())
  const [theme, setTheme] = useState<Theme>(() => readTheme())

  const activePage = useMemo(
    () => workspace.pages.find((p) => p.id === workspace.activePageId) ?? workspace.pages[0],
    [workspace],
  )

  const breadcrumb = useMemo(
    () => (activePage ? getBreadcrumb(workspace.pages, activePage.id) : []),
    [workspace.pages, activePage],
  )

  useEffect(() => {
    saveWorkspace(workspace)
  }, [workspace])

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
          <span className="hint-chip">
            <kbd>/</kbd> menu blok
          </span>
          <span className="hint-chip">
            <kbd>⋮⋮</kbd> seret urutan
          </span>
          <span className="hint-chip">Data lokal di browser ini</span>
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
