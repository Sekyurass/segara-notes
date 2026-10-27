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
    parentId: null,
    updatedAt: now,
    blocks: [
      createBlock('heading1', 'Segara Notes'),
      createBlock(
        'paragraph',
        'Catatan bergaya Notion. Ketik / untuk blok, seret ⋮⋮ untuk mengurutkan, dan buat sub-halaman dari sidebar.',
      ),
      createBlock('heading2', 'Coba ini'),
      createBlock('bullet', 'Enter → blok baru'),
      createBlock('bullet', 'Backspace di baris kosong → hapus blok'),
      createBlock('bullet', 'Seret handle ⋮⋮ → ubah urutan'),
      createBlock('todo', 'Centang to-do ini'),
      createBlock('code', 'const hello = "segara"'),
    ],
  }
}

export function createEmptyPage(
  title = 'Halaman tanpa judul',
  parentId: string | null = null,
): Page {
  return {
    id: createId('page'),
    title,
    icon: parentId ? '📎' : '📄',
    parentId,
    updatedAt: Date.now(),
    blocks: [createBlock('paragraph', '')],
  }
}

export function createDefaultWorkspace(): Workspace {
  const page = starterPage()
  return {
    version: 2,
    activePageId: page.id,
    pages: [page],
  }
}

function migrate(raw: unknown): Workspace {
  const data = raw as Partial<Workspace> & { pages?: Array<Partial<Page>> }
  if (!data?.pages?.length) return createDefaultWorkspace()

  const pages: Page[] = data.pages.map((page) => ({
    id: page.id ?? createId('page'),
    title: page.title ?? 'Tanpa judul',
    icon: page.icon ?? '📄',
    parentId: page.parentId === undefined ? null : page.parentId,
    updatedAt: page.updatedAt ?? Date.now(),
    blocks:
      page.blocks && page.blocks.length > 0
        ? page.blocks
        : [createBlock('paragraph', '')],
  }))

  const activePageId =
    data.activePageId && pages.some((p) => p.id === data.activePageId)
      ? data.activePageId
      : pages[0].id

  return { version: 2, activePageId, pages }
}

export function loadWorkspace(): Workspace {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createDefaultWorkspace()
    return migrate(JSON.parse(raw))
  } catch {
    return createDefaultWorkspace()
  }
}

export function saveWorkspace(workspace: Workspace): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace))
}
