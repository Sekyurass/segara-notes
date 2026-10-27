import type { Page, PageTreeNode } from '../types'

export function buildPageTree(pages: Page[]): PageTreeNode[] {
  const byParent = new Map<string | null, Page[]>()
  for (const page of pages) {
    const key = page.parentId
    const list = byParent.get(key) ?? []
    list.push(page)
    byParent.set(key, list)
  }

  for (const list of byParent.values()) {
    list.sort((a, b) => b.updatedAt - a.updatedAt)
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
  const byId = new Map(pages.map((p) => [p.id, p]))
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

/** Hapus page + semua turunannya. */
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
