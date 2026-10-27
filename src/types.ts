export type BlockType =
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'bullet'
  | 'numbered'
  | 'todo'
  | 'code'
  | 'quote'
  | 'divider'
  | 'callout'
  | 'toggle'
  | 'image'

export type CalloutTone = 'info' | 'warn' | 'success'

export type Block = {
  id: string
  type: BlockType
  text: string
  checked?: boolean
  indent?: number
  collapsed?: boolean
  calloutTone?: CalloutTone
  imageUrl?: string
}

export type Page = {
  id: string
  title: string
  icon: string
  cover: string | null
  parentId: string | null
  updatedAt: number
  favorite: boolean
  deletedAt: number | null
  order: number
  blocks: Block[]
}

export type Workspace = {
  version: 3
  activePageId: string
  pages: Page[]
  recentPageIds: string[]
}

export type SlashGroup = 'basic' | 'list' | 'media'

export type SlashItem = {
  type: BlockType
  label: string
  hint: string
  keywords: string[]
  group: SlashGroup
}

export type PageTreeNode = Page & {
  children: PageTreeNode[]
  depth: number
}

export type SearchHit = {
  pageId: string
  title: string
  icon: string
  snippet: string
}
