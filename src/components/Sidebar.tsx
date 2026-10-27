import { useMemo, useState } from 'react'
import { buildPageTree, flattenTree } from '../lib/pages'
import type { Page } from '../types'

type Props = {
  pages: Page[]
  activePageId: string
  theme: 'light' | 'dark'
  onSelect: (id: string) => void
  onCreateRoot: () => void
  onCreateChild: (parentId: string) => void
  onDelete: (id: string) => void
  onToggleTheme: () => void
}

export function Sidebar({
  pages,
  activePageId,
  theme,
  onSelect,
  onCreateRoot,
  onCreateChild,
  onDelete,
  onToggleTheme,
}: Props) {
  const flat = useMemo(() => flattenTree(buildPageTree(pages)), [pages])
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const visible = flat.filter((node) => {
    let parentId = node.parentId
    while (parentId) {
      if (collapsed[parentId]) return false
      parentId = pages.find((p) => p.id === parentId)?.parentId ?? null
    }
    return true
  })

  return (
    <aside className="sidebar">
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
      </div>

      <ul className="page-list">
        {visible.map((page) => {
          const hasChildren = pages.some((p) => p.parentId === page.id)
          const isCollapsed = Boolean(collapsed[page.id])
          return (
            <li
              key={page.id}
              className={`page-item${page.id === activePageId ? ' active' : ''}`}
              style={{ paddingLeft: `${page.depth * 14}px` }}
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

              <button type="button" className="page-item-btn" onClick={() => onSelect(page.id)}>
                <span className="page-icon" aria-hidden>
                  {page.icon}
                </span>
                <span className="page-name">{page.title || 'Tanpa judul'}</span>
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

              {pages.length > 1 && (
                <button
                  type="button"
                  className="page-delete"
                  aria-label={`Hapus ${page.title || 'halaman'}`}
                  onClick={() => onDelete(page.id)}
                >
                  ×
                </button>
              )}
            </li>
          )
        })}
      </ul>

      <div className="sidebar-foot">
        Disimpan di browser. Ketik <strong>/</strong> untuk blok, seret <strong>⋮⋮</strong> untuk
        urutan, tombol <strong>+</strong> untuk sub-halaman.
      </div>
    </aside>
  )
}
