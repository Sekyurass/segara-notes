import type { Workspace } from '../types'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8787'

export type SyncStatus = 'offline' | 'online' | 'saving' | 'error'

export async function pingApi(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/health`, { signal: AbortSignal.timeout(1500) })
    return res.ok
  } catch {
    return false
  }
}

export async function fetchWorkspaceRemote(): Promise<Workspace | null> {
  try {
    const res = await fetch(`${API_BASE}/api/workspace`, { signal: AbortSignal.timeout(2500) })
    if (res.status === 404) return null
    if (!res.ok) return null
    return (await res.json()) as Workspace
  } catch {
    return null
  }
}

export async function saveWorkspaceRemote(workspace: Workspace): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/workspace`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workspace),
      signal: AbortSignal.timeout(4000),
    })
    return res.ok
  } catch {
    return false
  }
}
