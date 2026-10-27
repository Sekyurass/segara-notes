import { useState, type FormEvent } from 'react'
import {
  clearWorkspacePin,
  hasWorkspaceLock,
  setWorkspacePin,
  verifyWorkspacePin,
} from '../lib/lock'

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
    <div className="lock-screen">
      <form className="lock-card" onSubmit={submit}>
        <div className="lock-brand">🌊 Segara Notes</div>
        <h1>{mode === 'setup' ? 'Pasang kunci workspace' : 'Workspace terkunci'}</h1>
        <p>
          {mode === 'setup'
            ? 'PIN disimpan lokal di browser ini (hash), tidak ikut sync ke server.'
            : 'Masukkan PIN untuk membuka catatan.'}
        </p>
        <label>
          PIN
          <input
            type="password"
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {mode === 'setup' && (
          <label>
            Konfirmasi
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </label>
        )}
        {error && <div className="lock-error">{error}</div>}
        <button type="submit" className="btn-primary" disabled={busy}>
          {mode === 'setup' ? 'Simpan PIN' : 'Buka'}
        </button>
        {mode === 'setup' && hasWorkspaceLock() && (
          <button type="button" className="btn-ghost" onClick={() => void clearWorkspacePin().then(onUnlocked)}>
            Hapus kunci
          </button>
        )}
      </form>
    </div>
  )
}
