import type { Block, Page, Workspace } from '../types'
import { createBlock } from './blocks'
import { createDefaultDatabase } from './database'
import { createId } from './id'

const STORAGE_KEY = 'segara-notes:v1'

export const COVER_PRESETS = [
  { id: 'teal', label: 'Teal', css: 'linear-gradient(120deg, #0f766e 0%, #99f6e4 100%)' },
  { id: 'dusk', label: 'Dusk', css: 'linear-gradient(120deg, #1e3a5f 0%, #f59e0b 100%)' },
  { id: 'mist', label: 'Mist', css: 'linear-gradient(120deg, #64748b 0%, #e2e8f0 100%)' },
  { id: 'coral', label: 'Coral', css: 'linear-gradient(120deg, #9a3412 0%, #fdba74 100%)' },
  { id: 'forest', label: 'Forest', css: 'linear-gradient(120deg, #14532d 0%, #86efac 100%)' },
] as const

export const PAGE_ICONS = ['🌊', '📄', '📎', '⭐', '🧠', '📌', '🗂', '💡', '🏠', '🚀', '📝', '🎯']

function starterPage(): Page {
  const now = Date.now()
  return {
    id: createId('page'),
    title: 'Selamat datang',
    icon: '🌊',
    cover: 'teal',
    parentId: null,
    updatedAt: now,
    favorite: true,
    deletedAt: null,
    order: 0,
    blocks: [
      createBlock('heading1', 'Segara Notes'),
      createBlock(
        'paragraph',
        'Mirip Notion: ketik / untuk blok, **Ctrl+K** untuk cari, seret ⋮⋮, dan @ untuk taut ke halaman.',
      ),
      createBlock('callout', 'Pilih teks lalu pakai toolbar untuk bold / italic / code / link.'),
      createBlock('heading2', 'Coba ini'),
      createBlock('bullet', 'Tab / Shift+Tab → indent list'),
      createBlock('todo', 'Tambah cover & icon di atas judul'),
      createBlock('numbered', 'Export Markdown dari topbar'),
      createBlock('quote', 'Catatan yang rapi dimulai dari satu blok.'),
      createBlock('code', 'const hello = "segara"'),
    ],
  }
}

export function createEmptyPage(
  title = 'Halaman tanpa judul',
  parentId: string | null = null,
  order = 0,
): Page {
  return {
    id: createId('page'),
    title,
    icon: parentId ? '📎' : '📄',
    cover: null,
    parentId,
    updatedAt: Date.now(),
    favorite: false,
    deletedAt: null,
    order,
    blocks: [createBlock('paragraph', '')],
  }
}

export function createDefaultWorkspace(): Workspace {
  const page = starterPage()
  return {
    version: 4,
    activePageId: page.id,
    pages: [page],
    recentPageIds: [page.id],
  }
}

function normalizeBlock(raw: Partial<Block>): Block {
  const type = (raw.type as Block['type']) ?? 'paragraph'
  return {
    id: raw.id ?? createId('block'),
    type,
    text: raw.text ?? (type === 'database' ? 'Database' : ''),
    indent: raw.indent ?? 0,
    checked: type === 'todo' ? Boolean(raw.checked) : undefined,
    collapsed: type === 'toggle' ? Boolean(raw.collapsed) : undefined,
    calloutTone: type === 'callout' ? raw.calloutTone ?? 'info' : undefined,
    imageUrl: type === 'image' ? raw.imageUrl ?? '' : undefined,
    database:
      type === 'database' ? raw.database ?? createDefaultDatabase(raw.text || 'Database') : undefined,
  }
}

export function normalizeWorkspace(raw: unknown): Workspace {
  const data = raw as Partial<Workspace> & { pages?: Array<Partial<Page>> }
  if (!data?.pages?.length) return createDefaultWorkspace()

  const pages: Page[] = data.pages.map((page, index) => ({
    id: page.id ?? createId('page'),
    title: page.title ?? 'Tanpa judul',
    icon: page.icon ?? '📄',
    cover: page.cover === undefined ? null : page.cover,
    parentId: page.parentId === undefined ? null : page.parentId,
    updatedAt: page.updatedAt ?? Date.now(),
    favorite: Boolean(page.favorite),
    deletedAt: page.deletedAt ?? null,
    order: typeof page.order === 'number' ? page.order : index,
    blocks:
      page.blocks && page.blocks.length > 0
        ? page.blocks.map((b) => normalizeBlock(b as Partial<Block>))
        : [createBlock('paragraph', '')],
  }))

  const live = pages.filter((p) => !p.deletedAt)
  const activePageId =
    data.activePageId && live.some((p) => p.id === data.activePageId)
      ? data.activePageId
      : live[0]?.id ?? pages[0].id

  const recentPageIds = (data.recentPageIds ?? [])
    .filter((id) => live.some((p) => p.id === id))
    .slice(0, 8)

  return {
    version: 4,
    activePageId,
    pages,
    recentPageIds: recentPageIds.length ? recentPageIds : [activePageId],
  }
}

export function loadWorkspace(): Workspace {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createDefaultWorkspace()
    return normalizeWorkspace(JSON.parse(raw))
  } catch {
    return createDefaultWorkspace()
  }
}

export function saveWorkspace(workspace: Workspace): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace))
}

export function coverCss(coverId: string | null): string | null {
  if (!coverId) return null
  return COVER_PRESETS.find((c) => c.id === coverId)?.css ?? null
}
