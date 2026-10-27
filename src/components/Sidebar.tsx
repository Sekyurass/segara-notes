import type { Page } from '../types'

type Props = {
  pages: Page[]
  activePageId: string
  theme: 'light' | 'dark'
  onSelect: (id: string) => void
  onCreate: () => void
  onDelete: (id: string) => void
  onToggleTheme: () => void
}

export function Sidebar({
  pages,
  activePageId,
  theme,
  onSelect,
  onCreate,
  onDelete,
  onToggleTheme,
}: Props) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-title">
          <strong>Segara Notes</strong>
          <span>MVP block editor</span>
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
        <button type="button" className="btn-primary" onClick={onCreate}>
          + Halaman
        </button>
      </div>

      <ul className="page-list">
        {pages.map((page) => (
          <li
            key={page.id}
            className={`page-item${page.id === activePageId ? ' active' : ''}`}
          >
            <button type="button" className="page-item-btn" onClick={() => onSelect(page.id)}>
              <span className="page-icon" aria-hidden>
                {page.icon}
              </span>
              <span className="page-name">{page.title || 'Tanpa judul'}</span>
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
        ))}
      </ul>

      <div className="sidebar-foot">
        Disimpan di browser (localStorage). Ketik <strong>/</strong> untuk menambah blok.
      </div>
    </aside>
  )
}
