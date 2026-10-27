import type { Page, PageTreeNode, SearchHit, Workspace } from '../types'

export function activePages(pages: Page[]): Page[] {
  return pages.filter((p) => !p.deletedAt)
}

export function trashedPages(pages: Page[]): Page[] {
  return pages
    .filter((p) => Boolean(p.deletedAt))
    .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0))
}

export function buildPageTree(pages: Page[]): PageTreeNode[] {
  const live = activePages(pages)
  const byParent = new Map<string | null, Page[]>()
  for (const page of live) {
    const key = page.parentId
    const list = byParent.get(key) ?? []
    list.push(page)
    byParent.set(key, list)
  }

  for (const list of byParent.values()) {
    list.sort((a, b) => a.order - b.order || b.updatedAt - a.updatedAt)
  }

  function walk(parentId: string | null, depth: number): PageTreeNode[] {
    return (byParent.get(parentId) ?? []).map((page) => ({
      ...page,
      depth,
      children: walk(page.id, depth + 1),
    }))
  }

  return walk(null, 0)
}

export function flattenTree(nodes: PageTreeNode[]): PageTreeNode[] {
  const out: PageTreeNode[] = []
  function walk(list: PageTreeNode[]) {
    for (const node of list) {
      out.push(node)
      walk(node.children)
    }
  }
  walk(nodes)
  return out
}

export function getBreadcrumb(pages: Page[], pageId: string): Page[] {
  const byId = new Map(activePages(pages).map((p) => [p.id, p]))
  const chain: Page[] = []
  let current = byId.get(pageId)
  const guard = new Set<string>()
  while (current && !guard.has(current.id)) {
    guard.add(current.id)
    chain.unshift(current)
    current = current.parentId ? byId.get(current.parentId) : undefined
  }
  return chain
}

/** Soft-delete: page + turunan. */
export function collectDescendantIds(pages: Page[], rootId: string): Set<string> {
  const ids = new Set<string>([rootId])
  let changed = true
  while (changed) {
    changed = false
    for (const page of pages) {
      if (page.parentId && ids.has(page.parentId) && !ids.has(page.id)) {
        ids.add(page.id)
        changed = true
      }
    }
  }
  return ids
}

export function reorderBlocks<T extends { id: string }>(
  items: T[],
  fromId: string,
  toId: string,
): T[] {
  if (fromId === toId) return items
  const from = items.findIndex((i) => i.id === fromId)
  const to = items.findIndex((i) => i.id === toId)
  if (from < 0 || to < 0) return items
  const next = [...items]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

/** Reorder sibling pages (same parent) by dragging. */
export function reorderSiblingPages(
  pages: Page[],
  fromId: string,
  toId: string,
): Page[] {
  const from = pages.find((p) => p.id === fromId)
  const to = pages.find((p) => p.id === toId)
  if (!from || !to || from.parentId !== to.parentId) return pages

  const siblings = pages
    .filter((p) => p.parentId === from.parentId && !p.deletedAt)
    .sort((a, b) => a.order - b.order)

  const orderedIds = reorderBlocks(
    siblings.map((p) => ({ id: p.id })),
    fromId,
    toId,
  ).map((p) => p.id)

  const orderMap = new Map(orderedIds.map((id, i) => [id, i]))
  return pages.map((p) =>
    orderMap.has(p.id) ? { ...p, order: orderMap.get(p.id)!, updatedAt: Date.now() } : p,
  )
}

export function nextOrder(pages: Page[], parentId: string | null): number {
  const siblings = pages.filter((p) => p.parentId === parentId && !p.deletedAt)
  if (siblings.length === 0) return 0
  return Math.max(...siblings.map((p) => p.order)) + 1
}

export function pushRecent(recent: string[], pageId: string, limit = 8): string[] {
  return [pageId, ...recent.filter((id) => id !== pageId)].slice(0, limit)
}

export function searchWorkspace(workspace: Workspace, query: string): SearchHit[] {
  const q = query.trim().toLowerCase()
  if (!q) {
    return activePages(workspace.pages)
      .slice()
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 12)
      .map((p) => ({
        pageId: p.id,
        title: p.title || 'Tanpa judul',
        icon: p.icon,
        snippet: 'Buka halaman',
      }))
  }

  const hits: SearchHit[] = []
  for (const page of activePages(workspace.pages)) {
    const title = page.title || 'Tanpa judul'
    if (title.toLowerCase().includes(q)) {
      hits.push({ pageId: page.id, title, icon: page.icon, snippet: 'Judul cocok' })
      continue
    }
    const block = page.blocks.find((b) => b.text.toLowerCase().includes(q))
    if (block) {
      const idx = block.text.toLowerCase().indexOf(q)
      const start = Math.max(0, idx - 24)
      const snippet = block.text.slice(start, start + 72).trim()
      hits.push({
        pageId: page.id,
        title,
        icon: page.icon,
        snippet: snippet || block.type,
      })
    }
  }
  return hits.slice(0, 20)
}

export function numberedLabel(blocks: { id: string; type: string; indent?: number }[], blockId: string): number {
  const index = blocks.findIndex((b) => b.id === blockId)
  if (index < 0) return 1
  const current = blocks[index]
  const indent = current.indent ?? 0
  let n = 1
  for (let i = index - 1; i >= 0; i -= 1) {
    const prev = blocks[i]
    if (prev.type !== 'numbered') break
    if ((prev.indent ?? 0) < indent) break
    if ((prev.indent ?? 0) === indent) n += 1
  }
  return n
}
