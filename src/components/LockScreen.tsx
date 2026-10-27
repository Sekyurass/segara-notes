import { useState, type FormEvent } from 'react'
import {
  clearWorkspacePin,
  hasWorkspaceLock,
  setWorkspacePin,
  verifyWorkspacePin,
} from '@/lib/lock'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Props = {
  mode: 'unlock' | 'setup'
  onUnlocked: () => void
}

export function LockScreen({ mode, onUnlocked }: Props) {
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (mode === 'setup') {
        if (pin.trim().length < 4) {
          setError('PIN minimal 4 karakter')
          return
        }
        if (pin !== confirm) {
          setError('Konfirmasi PIN tidak cocok')
          return
        }
        await setWorkspacePin(pin)
        onUnlocked()
        return
      }

      const ok = await verifyWorkspacePin(pin)
      if (!ok) {
        setError('PIN salah')
        return
      }
      onUnlocked()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-svh place-items-center bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent)] p-6">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader>
          <div className="text-sm font-medium">🌊 Segara Notes</div>
          <CardTitle className="text-xl">
            {mode === 'setup' ? 'Pasang kunci workspace' : 'Workspace terkunci'}
          </CardTitle>
          <CardDescription>
            {mode === 'setup'
              ? 'PIN disimpan lokal di browser ini (hash), tidak ikut sync ke server.'
              : 'Masukkan PIN untuk membuka catatan.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="pin">PIN</Label>
              <Input
                id="pin"
                type="password"
                autoFocus
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            {mode === 'setup' && (
              <div className="space-y-2">
                <Label htmlFor="confirm">Konfirmasi</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={busy}>
              {mode === 'setup' ? 'Simpan PIN' : 'Buka'}
            </Button>
            {mode === 'setup' && hasWorkspaceLock() && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => void clearWorkspacePin().then(onUnlocked)}
              >
                Hapus kunci
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
