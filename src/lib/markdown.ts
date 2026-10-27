import type { Block, Page } from '../types'

function blockToMarkdown(block: Block): string {
  switch (block.type) {
    case 'heading1':
      return `# ${block.text}`
    case 'heading2':
      return `## ${block.text}`
    case 'bullet':
      return `- ${block.text}`
    case 'todo':
      return `- [${block.checked ? 'x' : ' '}] ${block.text}`
    case 'code':
      return `\`\`\`\n${block.text}\n\`\`\``
    default:
      return block.text
  }
}

export function pageToMarkdown(page: Page): string {
  const title = `# ${page.title || 'Tanpa judul'}\n`
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
