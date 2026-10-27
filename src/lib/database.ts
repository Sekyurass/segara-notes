import type { DatabaseData, DbColumn, DbRow } from '../types'
import { createId } from './id'

export function createDefaultDatabase(title = 'Database'): DatabaseData {
  const nameCol: DbColumn = { id: createId('col'), name: 'Nama', type: 'text' }
  const statusCol: DbColumn = {
    id: createId('col'),
    name: 'Status',
    type: 'select',
    options: ['Todo', 'Doing', 'Done'],
  }
  const doneCol: DbColumn = { id: createId('col'), name: 'Selesai', type: 'checkbox' }

  const row = (name: string, status: string, done: boolean): DbRow => ({
    id: createId('row'),
    cells: {
      [nameCol.id]: name,
      [statusCol.id]: status,
      [doneCol.id]: done,
    },
  })

  return {
    view: 'table',
    columns: [nameCol, statusCol, doneCol],
    rows: [
      row(`${title} item 1`, 'Todo', false),
      row(`${title} item 2`, 'Doing', false),
      row(`${title} item 3`, 'Done', true),
    ],
    boardColumnId: statusCol.id,
  }
}

export function emptyRow(columns: DbColumn[]): DbRow {
  const cells: DbRow['cells'] = {}
  for (const col of columns) {
    if (col.type === 'checkbox') cells[col.id] = false
    else if (col.type === 'number') cells[col.id] = 0
    else if (col.type === 'select') cells[col.id] = col.options?.[0] ?? ''
    else cells[col.id] = ''
  }
  return { id: createId('row'), cells }
}

export function emptyColumn(name = 'Kolom'): DbColumn {
  return { id: createId('col'), name, type: 'text' }
}
