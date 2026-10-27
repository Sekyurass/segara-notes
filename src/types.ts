export type BlockType = 'paragraph' | 'heading1' | 'heading2' | 'bullet' | 'todo' | 'code'

export type Block = {
  id: string
  type: BlockType
  text: string
  checked?: boolean
}

export type Page = {
  id: string
  title: string
  icon: string
  updatedAt: number
  blocks: Block[]
}

export type Workspace = {
  version: 1
  activePageId: string
  pages: Page[]
}

export type SlashItem = {
  type: BlockType
  label: string
  hint: string
  keywords: string[]
}
