import { useEffect, useMemo, useState } from 'react'
import { searchWorkspace } from '../lib/pages'
import type { Workspace } from '../types'

type Props = {
  open: boolean
  workspace: Workspace
  onClose: () => void
  onSelect: (pageId: string) => void
}

export function CommandPalette({ open, workspace, onClose, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const hits = useMemo(() => searchWorkspace(workspace, query), [workspace, query])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setIndex(0)
  }, [open])

  useEffect(() => {
    setIndex(0)
  }, [query])

  if (!open) return null

  function choose(id: string) {
    onSelect(id)
    onClose()
  }

  return (
    <div className="palette-backdrop" onClick={onClose} role="presentation">
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label="Cari halaman"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          className="palette-input"
          placeholder="Cari halaman atau isi blok…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault()
              onClose()
            }
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setIndex((i) => Math.min(i + 1, Math.max(hits.length - 1, 0)))
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault()
              setIndex((i) => Math.max(i - 1, 0))
            }
            if (e.key === 'Enter' && hits[index]) {
              e.preventDefault()
              choose(hits[index].pageId)
            }
          }}
        />
        <ul className="palette-list">
          {hits.length === 0 && <li className="palette-empty">Tidak ada hasil</li>}
          {hits.map((hit, i) => (
            <li key={`${hit.pageId}-${i}`}>
              <button
                type="button"
                className={`palette-item${i === index ? ' active' : ''}`}
                onMouseEnter={() => setIndex(i)}
                onClick={() => choose(hit.pageId)}
              >
                <span className="palette-icon">{hit.icon}</span>
                <span className="palette-meta">
                  <strong>{hit.title}</strong>
                  <span>{hit.snippet}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="palette-foot">
          <kbd>↑↓</kbd> navigasi · <kbd>Enter</kbd> buka · <kbd>Esc</kbd> tutup
        </div>
      </div>
    </div>
  )
}
