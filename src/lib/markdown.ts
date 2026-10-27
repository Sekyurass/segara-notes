import type { Block, Page } from '../types'
import { clampIndent } from './blocks'

function blockToMarkdown(block: Block): string {
  const pad = '  '.repeat(clampIndent(block.indent))
  switch (block.type) {
    case 'heading1':
      return `# ${block.text}`
    case 'heading2':
      return `## ${block.text}`
    case 'heading3':
      return `### ${block.text}`
    case 'bullet':
      return `${pad}- ${block.text}`
    case 'numbered':
      return `${pad}1. ${block.text}`
    case 'todo':
      return `${pad}- [${block.checked ? 'x' : ' '}] ${block.text}`
    case 'code':
      return `\`\`\`\n${block.text}\n\`\`\``
    case 'quote':
      return block.text
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n')
    case 'callout':
      return `> 💡 ${block.text}`
    case 'toggle':
      return `<details>\n<summary>${block.text || 'Toggle'}</summary>\n\n</details>`
    case 'divider':
      return '---'
    case 'image':
      return `![${block.text || 'image'}](${block.imageUrl || ''})`
    case 'database': {
      const db = block.database
      if (!db) return `### ${block.text || 'Database'}`
      const header = db.columns.map((c) => c.name).join(' | ')
      const sep = db.columns.map(() => '---').join(' | ')
      const rows = db.rows
        .map((row) => db.columns.map((c) => String(row.cells[c.id] ?? '')).join(' | '))
        .join('\n')
      return `### ${block.text || 'Database'}\n\n| ${header} |\n| ${sep} |\n${rows
        .split('\n')
        .map((r) => `| ${r} |`)
        .join('\n')}`
    }
    default:
      return block.text
  }
}

export function pageToMarkdown(page: Page): string {
  const title = `# ${page.icon} ${page.title || 'Tanpa judul'}\n`
  const body = page.blocks.map(blockToMarkdown).join('\n\n')
  return `${title}\n${body}\n`
}

export function downloadMarkdown(page: Page): void {
  const content = pageToMarkdown(page)
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const safe = (page.title || 'catatan').replace(/[\\/:*?"<>|]+/g, '-')
  a.href = url
  a.download = `${safe}.md`
  a.click()
  URL.revokeObjectURL(url)
}
