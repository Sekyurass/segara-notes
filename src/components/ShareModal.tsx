import { useState } from 'react'
import { createShareLink } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

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

  async function create() {
    setBusy(true)
    setError('')
    const token = await createShareLink(pageId)
    setBusy(false)
    if (!token) {
      setError('Gagal membuat link. Pastikan API (`npm run dev:api`) berjalan.')
      return
    }
    setUrl(`${window.location.origin}${window.location.pathname}?share=${token}`)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setUrl('')
          setError('')
          onClose()
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bagikan halaman</DialogTitle>
          <DialogDescription>
            Link read-only untuk <strong>{pageTitle || 'Tanpa judul'}</strong>. Penerima bisa melihat
            halaman tanpa mengedit workspace Anda.
          </DialogDescription>
        </DialogHeader>

        {!url ? (
          <Button disabled={busy} onClick={() => void create()}>
            {busy ? 'Membuat…' : 'Buat link share'}
          </Button>
        ) : (
          <div className="flex gap-2">
            <Input readOnly value={url} onFocus={(e) => e.target.select()} />
            <Button variant="secondary" onClick={() => void navigator.clipboard.writeText(url)}>
              Salin
            </Button>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
