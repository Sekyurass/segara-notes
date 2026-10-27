import { useMemo, useState, type DragEvent } from 'react'
import { activePages, buildPageTree, flattenTree, trashedPages } from '../lib/pages'
import type { Page } from '../types'

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

export function Sidebar({
  pages,
  activePageId,
  theme,
  mobileOpen,
  onCloseMobile,
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
}: Props) {
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
    <>
      {mobileOpen && <div className="sidebar-backdrop" onClick={onCloseMobile} aria-hidden />}
      <aside className={`sidebar${mobileOpen ? ' open' : ''}`}>
        <div className="brand">
          <div className="brand-title">
            <strong>Segara Notes</strong>
            <span>Block editor</span>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={onToggleTheme}
            aria-label="Ganti tema"
            title="Ganti tema"
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </div>

        <div className="sidebar-actions">
          <button type="button" className="btn-primary" onClick={onCreateRoot}>
            + Halaman
          </button>
          <button type="button" className="btn-ghost" onClick={onOpenSearch} title="Ctrl+K">
            Cari
          </button>
        </div>

        {favorites.length > 0 && (
          <div className="sidebar-section">
            <div className="sidebar-section-label">Favorit</div>
            <ul className="page-list compact">
              {favorites.map((page) => (
                <li
                  key={`fav-${page.id}`}
                  className={`page-item${page.id === activePageId ? ' active' : ''}`}
                >
                  <span className="page-twist spacer" aria-hidden />
                  <button type="button" className="page-item-btn" onClick={() => select(page.id)}>
                    <span className="page-icon">{page.icon}</span>
                    <span className="page-name">{page.title || 'Tanpa judul'}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="sidebar-section">
          <div className="sidebar-section-label">Halaman</div>
          <ul className="page-list">
            {visible.map((page) => {
              const hasChildren = live.some((p) => p.parentId === page.id)
              const isCollapsed = Boolean(collapsed[page.id])
              return (
                <li
                  key={page.id}
                  className={`page-item${page.id === activePageId ? ' active' : ''}${
                    dragId === page.id ? ' is-dragging' : ''
                  }`}
                  style={{ paddingLeft: `${page.depth * 14}px` }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    onPageDrop(page.id)
                  }}
                >
                  {hasChildren ? (
                    <button
                      type="button"
                      className="page-twist"
                      aria-label={isCollapsed ? 'Bentangkan' : 'Ciutkan'}
                      onClick={() =>
                        setCollapsed((prev) => ({ ...prev, [page.id]: !prev[page.id] }))
                      }
                    >
                      {isCollapsed ? '▸' : '▾'}
                    </button>
                  ) : (
                    <span className="page-twist spacer" aria-hidden />
                  )}

                  <button
                    type="button"
                    className="page-item-btn"
                    draggable
                    onDragStart={(e) => onPageDragStart(e, page.id)}
                    onDragEnd={() => setDragId(null)}
                    onClick={() => select(page.id)}
                  >
                    <span className="page-icon" aria-hidden>
                      {page.icon}
                    </span>
                    <span className="page-name">{page.title || 'Tanpa judul'}</span>
                  </button>

                  <button
                    type="button"
                    className="page-fav"
                    aria-label="Favorit"
                    title="Favorit"
                    onClick={() => onToggleFavorite(page.id)}
                  >
                    {page.favorite ? '★' : '☆'}
                  </button>

                  <button
                    type="button"
                    className="page-add-child"
                    aria-label="Tambah sub-halaman"
                    title="Tambah sub-halaman"
                    onClick={() => onCreateChild(page.id)}
                  >
                    +
                  </button>

                  {live.length > 1 && (
                    <button
                      type="button"
                      className="page-delete"
                      aria-label={`Pindah ke trash ${page.title || 'halaman'}`}
                      onClick={() => onSoftDelete(page.id)}
                    >
                      ×
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>

        <div className="sidebar-section trash-section">
          <button
            type="button"
            className="trash-toggle"
            onClick={() => setShowTrash((v) => !v)}
          >
            Trash {trash.length > 0 ? `(${trash.length})` : ''}
          </button>
          {showTrash && (
            <ul className="page-list compact">
              {trash.length === 0 && (
                <li className="trash-empty">Kosong</li>
              )}
              {trash.map((page) => (
                <li key={`trash-${page.id}`} className="page-item trash-item">
                  <span className="page-twist spacer" aria-hidden />
                  <span className="page-item-btn static">
                    <span className="page-icon">{page.icon}</span>
                    <span className="page-name">{page.title || 'Tanpa judul'}</span>
                  </span>
                  <button type="button" className="page-add-child" onClick={() => onRestore(page.id)}>
                    ↩
                  </button>
                  <button type="button" className="page-delete" onClick={() => onPurge(page.id)}>
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="sidebar-foot">
          <kbd>/</kbd> blok · <kbd>@</kbd> mention · <kbd>Ctrl+K</kbd> cari · seret halaman untuk
          urutan
        </div>
      </aside>
    </>
  )
}
