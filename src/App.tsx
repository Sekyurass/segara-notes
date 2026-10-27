import { useEffect, useMemo, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { Editor } from './components/Editor'
import { createEmptyPage, loadWorkspace, saveWorkspace } from './lib/storage'
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

  useEffect(() => {
    saveWorkspace(workspace)
  }, [workspace])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('segara-notes:theme', theme)
  }, [theme])

  function patchActive(updater: (pageId: string) => Partial<{ title: string; blocks: Block[] }>) {
    setWorkspace((prev) => ({
      ...prev,
      pages: prev.pages.map((page) => {
        if (page.id !== prev.activePageId) return page
        return {
          ...page,
          ...updater(page.id),
          updatedAt: Date.now(),
        }
      }),
    }))
  }

  function createPage() {
    const page = createEmptyPage()
    setWorkspace((prev) => ({
      ...prev,
      activePageId: page.id,
      pages: [page, ...prev.pages],
    }))
  }

  function deletePage(id: string) {
    setWorkspace((prev) => {
      if (prev.pages.length <= 1) return prev
      const pages = prev.pages.filter((p) => p.id !== id)
      const activePageId =
        prev.activePageId === id ? pages[0].id : prev.activePageId
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
        onCreate={createPage}
        onDelete={deletePage}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      />

      <main className="workspace">
        <div className="topbar">
          <span className="hint-chip">
            <kbd>/</kbd> menu blok
          </span>
          <span className="hint-chip">Data lokal di browser ini</span>
        </div>
        <div className="editor-scroll">
          <Editor
            page={activePage}
            onChangeTitle={(title) => patchActive(() => ({ title }))}
            onChangeBlocks={(blocks) => patchActive(() => ({ blocks }))}
          />
        </div>
      </main>
    </div>
  )
}
