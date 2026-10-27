import { useState } from 'react'
import { createShareLink } from '../lib/api'

type Props = {
  pageId: string
  pageTitle: string
  open: boolean
  onClose: () => void
}

export function ShareModal({ pageId, pageTitle, open, onClose }: Props) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!open) return null

  async function create() {
    setBusy(true)
    setError('')
    const token = await createShareLink(pageId)
    setBusy(false)
    if (!token) {
      setError('Gagal membuat link. Pastikan API (`npm run dev:api`) berjalan.')
      return
    }
    const shareUrl = `${window.location.origin}${window.location.pathname}?share=${token}`
    setUrl(shareUrl)
  }

  return (
    <div className="palette-backdrop" onClick={onClose} role="presentation">
      <div className="share-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <h2>Bagikan halaman</h2>
        <p>
          Link read-only untuk <strong>{pageTitle || 'Tanpa judul'}</strong>. Penerima bisa melihat
          snapshot halaman tanpa mengedit workspace Anda.
        </p>
        {!url ? (
          <button type="button" className="btn-primary" disabled={busy} onClick={() => void create()}>
            {busy ? 'Membuat…' : 'Buat link share'}
          </button>
        ) : (
          <div className="share-result">
            <input readOnly value={url} onFocus={(e) => e.target.select()} />
            <button
              type="button"
              className="btn-ghost"
              onClick={() => void navigator.clipboard.writeText(url)}
            >
              Salin
            </button>
          </div>
        )}
        {error && <div className="lock-error">{error}</div>}
        <button type="button" className="btn-ghost" onClick={onClose}>
          Tutup
        </button>
      </div>
    </div>
  )
}
