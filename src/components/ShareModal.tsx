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
  const [canEdit, setCanEdit] = useState(false)

  async function create() {
    setBusy(true)
    setError('')
    const token = await createShareLink(pageId, canEdit)
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
          setCanEdit(false)
          onClose()
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bagikan halaman</DialogTitle>
          <DialogDescription>
            Link untuk <strong>{pageTitle || 'Tanpa judul'}</strong>. Pilih izin baca saja atau boleh
            edit.
          </DialogDescription>
        </DialogHeader>

        {!url ? (
          <div className="space-y-3">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border px-3 py-2.5">
              <input
                type="checkbox"
                className="mt-1 size-4 accent-primary"
                checked={canEdit}
                onChange={(e) => setCanEdit(e.target.checked)}
              />
              <span>
                <span className="block text-sm font-medium">Izinkan edit</span>
                <span className="text-xs text-muted-foreground">
                  Penerima bisa mengubah judul dan isi halaman lewat link.
                </span>
              </span>
            </label>
            <Button disabled={busy} onClick={() => void create()}>
              {busy ? 'Membuat…' : 'Buat link share'}
            </Button>
          </div>
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
