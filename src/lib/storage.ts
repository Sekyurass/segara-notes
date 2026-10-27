import type { Page, Workspace } from '../types'
import { createBlock } from './blocks'
import { createId } from './id'

const STORAGE_KEY = 'segara-notes:v1'

function starterPage(): Page {
  const now = Date.now()
  return {
    id: createId('page'),
    title: 'Selamat datang',
    icon: '🌊',
    updatedAt: now,
    blocks: [
      createBlock(
        'heading1',
        'Segara Notes',
      ),
      createBlock(
        'paragraph',
        'MVP catatan bergaya Notion. Ketik / di awal baris untuk menambah blok.',
      ),
      createBlock('heading2', 'Coba ini'),
      createBlock('bullet', 'Enter → blok baru'),
      createBlock('bullet', 'Backspace di baris kosong → hapus blok'),
      createBlock('todo', 'Centang to-do ini'),
      createBlock('code', 'const hello = "segara"'),
    ],
  }
}

export function createEmptyPage(title = 'Halaman tanpa judul'): Page {
  return {
    id: createId('page'),
    title,
    icon: '📄',
    updatedAt: Date.now(),
    blocks: [createBlock('paragraph', '')],
  }
}

export function createDefaultWorkspace(): Workspace {
  const page = starterPage()
  return {
    version: 1,
    activePageId: page.id,
    pages: [page],
  }
}

export function loadWorkspace(): Workspace {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createDefaultWorkspace()
    const parsed = JSON.parse(raw) as Workspace
    if (!parsed?.pages?.length) return createDefaultWorkspace()
    return parsed
  } catch {
    return createDefaultWorkspace()
  }
}

export function saveWorkspace(workspace: Workspace): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace))
}
