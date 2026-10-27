import type { Block, BlockType, SlashItem } from '../types'
import { createId } from './id'

export const SLASH_ITEMS: SlashItem[] = [
  {
    type: 'paragraph',
    label: 'Teks',
    hint: 'Paragraf biasa',
    keywords: ['text', 'paragraph', 'p'],
  },
  {
    type: 'heading1',
    label: 'Heading 1',
    hint: 'Judul besar',
    keywords: ['h1', 'title', 'heading'],
  },
  {
    type: 'heading2',
    label: 'Heading 2',
    hint: 'Subjudul',
    keywords: ['h2', 'subtitle', 'heading'],
  },
  {
    type: 'bullet',
    label: 'Bullet list',
    hint: 'Daftar berpoin',
    keywords: ['ul', 'list', 'bullet'],
  },
  {
    type: 'todo',
    label: 'To-do',
    hint: 'Checklist',
    keywords: ['todo', 'check', 'task'],
  },
  {
    type: 'code',
    label: 'Code',
    hint: 'Blok kode',
    keywords: ['code', 'pre', 'snippet'],
  },
]

export function createBlock(type: BlockType = 'paragraph', text = ''): Block {
  return {
    id: createId('block'),
    type,
    text,
    checked: type === 'todo' ? false : undefined,
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
