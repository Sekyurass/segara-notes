import type { Block, BlockType, SlashGroup, SlashItem } from '../types'
import { createDefaultDatabase } from './database'
import { createId } from './id'

export const SLASH_ITEMS: SlashItem[] = [
  {
    type: 'paragraph',
    label: 'Teks',
    hint: 'Paragraf biasa',
    keywords: ['text', 'paragraph', 'p'],
    group: 'basic',
  },
  {
    type: 'heading1',
    label: 'Heading 1',
    hint: 'Judul besar',
    keywords: ['h1', 'title', 'heading'],
    group: 'basic',
  },
  {
    type: 'heading2',
    label: 'Heading 2',
    hint: 'Subjudul',
    keywords: ['h2', 'subtitle', 'heading'],
    group: 'basic',
  },
  {
    type: 'heading3',
    label: 'Heading 3',
    hint: 'Sub-subjudul',
    keywords: ['h3', 'heading'],
    group: 'basic',
  },
  {
    type: 'quote',
    label: 'Quote',
    hint: 'Kutipan',
    keywords: ['quote', 'blockquote'],
    group: 'basic',
  },
  {
    type: 'callout',
    label: 'Callout',
    hint: 'Catatan penting',
    keywords: ['callout', 'note', 'info'],
    group: 'basic',
  },
  {
    type: 'toggle',
    label: 'Toggle',
    hint: 'Konten bisa dilipat',
    keywords: ['toggle', 'collapse', 'fold'],
    group: 'basic',
  },
  {
    type: 'divider',
    label: 'Divider',
    hint: 'Garis pemisah',
    keywords: ['divider', 'hr', 'line'],
    group: 'basic',
  },
  {
    type: 'bullet',
    label: 'Bullet list',
    hint: 'Daftar berpoin',
    keywords: ['ul', 'list', 'bullet'],
    group: 'list',
  },
  {
    type: 'numbered',
    label: 'Numbered list',
    hint: 'Daftar bernomor',
    keywords: ['ol', 'numbered', 'list'],
    group: 'list',
  },
  {
    type: 'todo',
    label: 'To-do',
    hint: 'Checklist',
    keywords: ['todo', 'check', 'task'],
    group: 'list',
  },
  {
    type: 'code',
    label: 'Code',
    hint: 'Blok kode',
    keywords: ['code', 'pre', 'snippet'],
    group: 'media',
  },
  {
    type: 'image',
    label: 'Image',
    hint: 'Gambar dari URL',
    keywords: ['image', 'img', 'photo', 'gambar'],
    group: 'media',
  },
  {
    type: 'database',
    label: 'Database',
    hint: 'Tabel / board sederhana',
    keywords: ['database', 'table', 'board', 'kanban', 'db'],
    group: 'media',
  },
]

export const SLASH_GROUP_LABEL: Record<SlashGroup, string> = {
  basic: 'Dasar',
  list: 'Daftar',
  media: 'Media',
}

export const BLOCK_GLYPH: Record<BlockType, string> = {
  paragraph: 'T',
  heading1: 'H1',
  heading2: 'H2',
  heading3: 'H3',
  bullet: '•',
  numbered: '1.',
  todo: '☑',
  code: '</>',
  quote: '“',
  divider: '—',
  callout: '💡',
  toggle: '▸',
  image: '🖼',
  database: '▦',
}

export function createBlock(type: BlockType = 'paragraph', text = ''): Block {
  return {
    id: createId('block'),
    type,
    text: type === 'database' ? 'Database' : text,
    indent: 0,
    checked: type === 'todo' ? false : undefined,
    collapsed: type === 'toggle' ? false : undefined,
    calloutTone: type === 'callout' ? 'info' : undefined,
    imageUrl: type === 'image' ? '' : undefined,
    database: type === 'database' ? createDefaultDatabase() : undefined,
  }
}

export function filterSlashItems(query: string): SlashItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return SLASH_ITEMS
  return SLASH_ITEMS.filter(
    (item) =>
      item.label.toLowerCase().includes(q) ||
      item.hint.toLowerCase().includes(q) ||
      item.keywords.some((k) => k.includes(q)),
  )
}

export function clampIndent(n: number | undefined): number {
  return Math.max(0, Math.min(4, n ?? 0))
}
