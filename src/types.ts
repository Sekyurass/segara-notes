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
  | 'database'
  | 'embed'
  | 'bookmark'
  | 'comment'

export type CalloutTone = 'info' | 'warn' | 'success'

export type DbColumnType = 'text' | 'number' | 'select' | 'checkbox' | 'date'
export type DbView = 'table' | 'board' | 'calendar' | 'gallery' | 'list'

export type DbColumn = {
  id: string
  name: string
  type: DbColumnType
  options?: string[]
}

export type DbRow = {
  id: string
  cells: Record<string, string | boolean | number>
}

export type DbSort = {
  columnId: string
  direction: 'asc' | 'desc'
}

export type DbFilter = {
  columnId: string
  query: string
}

export type DatabaseData = {
  view: DbView
  columns: DbColumn[]
  rows: DbRow[]
  boardColumnId?: string
  dateColumnId?: string
  titleColumnId?: string
  sort?: DbSort | null
  filter?: DbFilter | null
}

export type PageComment = {
  id: string
  text: string
  createdAt: number
  author?: string | null
  /** page ids mentioned via [[id:…]] */
  mentionPageIds?: string[]
  resolvedAt?: number | null
}

export type Block = {
  id: string
  type: BlockType
  text: string
  checked?: boolean
  indent?: number
  collapsed?: boolean
  calloutTone?: CalloutTone
  imageUrl?: string
  embedUrl?: string
  database?: DatabaseData
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
  comments?: PageComment[]
}

/** Modul tugas ala ClickUp — digabung dengan notes */
export type TaskPriority = 'urgent' | 'high' | 'normal' | 'low' | 'none'

export type TaskStatusCategory = 'open' | 'active' | 'done' | 'closed'

export type TaskStatus = {
  id: string
  name: string
  color: string
  category: TaskStatusCategory
  order: number
}

export type TaskList = {
  id: string
  name: string
  icon: string
  order: number
}

export type TaskSpace = {
  id: string
  name: string
  order: number
}

export type TaskFolder = {
  id: string
  spaceId: string
  name: string
  order: number
}

export type TaskChecklistItem = {
  id: string
  text: string
  checked: boolean
}

export type TaskAttachment = {
  id: string
  name: string
  url: string
}

export type TaskRecur = 'none' | 'daily' | 'weekly' | 'monthly'

export type Task = {
  id: string
  listId: string
  title: string
  description: string
  statusId: string
  priority: TaskPriority
  dueDate: string | null
  /** HH:mm lokal */
  dueTime: string | null
  tags: string[]
  assignee: string | null
  pageId: string | null
  parentTaskId: string | null
  checklist: TaskChecklistItem[]
  attachments: TaskAttachment[]
  recur: TaskRecur
  order: number
  createdAt: number
  updatedAt: number
  completedAt: number | null
}

export type TaskTemplate = {
  id: string
  name: string
  title: string
  description: string
  priority: TaskPriority
  tags: string[]
  checklist: TaskChecklistItem[]
}

export type ActivityKind =
  | 'page'
  | 'task'
  | 'comment'
  | 'share'
  | 'import'
  | 'system'

export type ActivityEvent = {
  id: string
  at: number
  kind: ActivityKind
  summary: string
  actor?: string | null
  pageId?: string | null
  taskId?: string | null
}

export type TaskDropMode = 'before' | 'after' | 'into'
export type TaskSort = 'order' | 'due' | 'priority' | 'title'
export type TaskDueFilter = 'all' | 'today' | 'overdue' | 'upcoming' | 'none'

export type AppMode = 'notes' | 'tasks' | 'today' | 'activity'
export type TaskView = 'list' | 'board' | 'calendar'

export type Workspace = {
  version: 6
  revision: number
  activePageId: string
  pages: Page[]
  recentPageIds: string[]
  mode: AppMode
  taskLists: TaskList[]
  tasks: Task[]
  taskStatuses: TaskStatus[]
  activeTaskListId: string
  taskView: TaskView
  taskSpaces: TaskSpace[]
  taskFolders: TaskFolder[]
  taskTemplates: TaskTemplate[]
  activity: ActivityEvent[]
  displayName: string
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

export type PageSnapshot = {
  id: string
  pageId: string
  title: string
  savedAt: number
  page: Page
}
