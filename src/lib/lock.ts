const LOCK_KEY = 'segara-notes:lock-hash'
const UNLOCK_KEY = 'segara-notes:unlocked'

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function hasWorkspaceLock(): boolean {
  return Boolean(localStorage.getItem(LOCK_KEY))
}

export function isUnlockedSession(): boolean {
  if (!hasWorkspaceLock()) return true
  return sessionStorage.getItem(UNLOCK_KEY) === '1'
}

export async function setWorkspacePin(pin: string): Promise<void> {
  const hash = await sha256(pin.trim())
  localStorage.setItem(LOCK_KEY, hash)
  sessionStorage.setItem(UNLOCK_KEY, '1')
}

export async function clearWorkspacePin(): Promise<void> {
  localStorage.removeItem(LOCK_KEY)
  sessionStorage.removeItem(UNLOCK_KEY)
}

export async function verifyWorkspacePin(pin: string): Promise<boolean> {
  const stored = localStorage.getItem(LOCK_KEY)
  if (!stored) return true
  const hash = await sha256(pin.trim())
  if (hash !== stored) return false
  sessionStorage.setItem(UNLOCK_KEY, '1')
  return true
}

export function lockSession(): void {
  sessionStorage.removeItem(UNLOCK_KEY)
}
