import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import type {
  DatabaseData,
  DbColumn,
  DbColumnType,
  DbRow,
  DbView,
  Page,
  Task,
} from '@/types'
import {
  dateColumn,
  emptyColumn,
  emptyRow,
  evalFormula,
  evalRollup,
  formatMultiSelect,
  formatRelation,
  parseMultiSelect,
  parseRelation,
  titleColumn,
  visibleRows,
} from '@/lib/database'
import type { DbRollupProperty } from '@/types'
import { DatePickerField } from '@/components/DateTimePickers'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

type Props = {
  title: string
  data: DatabaseData
  pages?: Page[]
  tasks?: Task[]
  onChangeTitle: (title: string) => void
  onChange: (data: DatabaseData) => void
  onDeleteBlock: () => void
  onOpenPage?: (pageId: string) => void
  onOpenTask?: (taskId: string) => void
}

export function DatabaseBlock({
  title,
  data,
  pages = [],
  tasks = [],
  onChangeTitle,
  onChange,
  onDeleteBlock,
  onOpenPage,
  onOpenTask,
}: Props) {
  const [dragRowId, setDragRowId] = useState<string | null>(null)
  const [optionDraft, setOptionDraft] = useState<Record<string, string>>({})
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const boardCol =
    data.columns.find((c) => c.id === data.boardColumnId && c.type === 'select') ??
    data.columns.find((c) => c.type === 'select')
  const dateCol = dateColumn(data)
  const nameCol = titleColumn(data)
  const rows = visibleRows(data)

  function patch(partial: Partial<DatabaseData>) {
    onChange({ ...data, ...partial })
  }

  function updateCell(rowId: string, colId: string, value: string | boolean | number) {
    patch({
      rows: data.rows.map((row) =>
        row.id === rowId ? { ...row, cells: { ...row.cells, [colId]: value } } : row,
      ),
    })
  }

  function updateColumn(colId: string, partial: Partial<DbColumn>) {
    patch({
      columns: data.columns.map((c) => (c.id === colId ? { ...c, ...partial } : c)),
    })
  }

  function addRow() {
    patch({ rows: [...data.rows, emptyRow(data.columns)] })
  }

  function addColumn() {
    const col = emptyColumn(`Kolom ${data.columns.length + 1}`)
    patch({
      columns: [...data.columns, col],
      rows: data.rows.map((row) => ({
        ...row,
        cells: { ...row.cells, [col.id]: '' },
      })),
    })
  }

  function removeRow(id: string) {
    patch({ rows: data.rows.filter((r) => r.id !== id) })
  }

  function setColumnType(col: DbColumn, type: DbColumnType) {
    updateColumn(col.id, {
      type,
      options:
        type === 'select' || type === 'multi_select'
          ? col.options ?? ['Todo', 'Doing', 'Done']
          : undefined,
      relationKind: type === 'relation' ? col.relationKind ?? 'any' : undefined,
      formula: type === 'formula' ? col.formula ?? '{Kolom} + 0' : undefined,
      rollupRelationColumnId:
        type === 'rollup'
          ? col.rollupRelationColumnId ??
            data.columns.find((c) => c.type === 'relation' || c.type === 'multi_select')
              ?.id
          : undefined,
      rollupProperty: type === 'rollup' ? col.rollupProperty ?? 'title' : undefined,
    })
    if (type === 'date' && !data.dateColumnId) patch({ dateColumnId: col.id })
  }

  function addOption(col: DbColumn) {
    const raw = (optionDraft[col.id] ?? '').trim()
    if (!raw) return
    const options = [...(col.options ?? [])]
    if (options.includes(raw)) return
    updateColumn(col.id, { options: [...options, raw] })
    setOptionDraft((prev) => ({ ...prev, [col.id]: '' }))
  }

  function removeOption(col: DbColumn, opt: string) {
    updateColumn(col.id, {
      options: (col.options ?? []).filter((o) => o !== opt),
    })
  }

  function setView(view: DbView) {
    patch({
      view,
      boardColumnId:
        view === 'board'
          ? boardCol?.id ?? data.columns.find((c) => c.type === 'select')?.id
          : data.boardColumnId,
      dateColumnId:
        view === 'calendar'
          ? dateCol?.id ?? data.columns.find((c) => c.type === 'date')?.id
          : data.dateColumnId,
    })
  }

  function dropOnStatus(status: string) {
    if (!dragRowId || !boardCol) return
    updateCell(dragRowId, boardCol.id, status)
    setDragRowId(null)
  }

  const groups =
    boardCol?.options?.map((opt) => ({
      name: opt,
      rows: rows.filter((r) => String(r.cells[boardCol.id] ?? '') === opt),
    })) ?? []

  const ungrouped =
    boardCol != null
      ? rows.filter((r) => !boardCol.options?.includes(String(r.cells[boardCol.id] ?? '')))
      : []

  const year = month.getFullYear()
  const mo = month.getMonth()
  const monthKey = `${year}-${String(mo + 1).padStart(2, '0')}`
  const monthLabel = month.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
  const daysInMonth = new Date(year, mo + 1, 0).getDate()
  const startWeekday = new Date(year, mo, 1).getDay()
  const cells: (number | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const livePages = pages.filter((p) => !p.deletedAt)
  const rootTasks = tasks.filter((t) => !t.parentTaskId)

  return (
    <Card className="w-full overflow-hidden py-0 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2.5">
        <Input
          value={title}
          onChange={(e) => onChangeTitle(e.target.value)}
          className="h-8 max-w-[12rem] border-0 bg-transparent px-1 font-semibold shadow-none focus-visible:ring-0"
          aria-label="Judul database"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={data.view} onValueChange={(v) => setView(v as DbView)}>
            <TabsList>
              <TabsTrigger value="table">Tabel</TabsTrigger>
              <TabsTrigger value="board">Board</TabsTrigger>
              <TabsTrigger value="list">List</TabsTrigger>
              <TabsTrigger value="gallery">Gallery</TabsTrigger>
              <TabsTrigger value="calendar">Kalender</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button type="button" size="sm" variant="secondary" onClick={addRow}>
            + Baris
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={addColumn}>
            + Kolom
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onDeleteBlock}>
            Hapus
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border px-3 py-2">
        <Select
          value={data.filter?.columnId ?? '__none'}
          onValueChange={(columnId) =>
            patch({
              filter:
                columnId === '__none'
                  ? null
                  : { columnId, query: data.filter?.query ?? '' },
            })
          }
        >
          <SelectTrigger className="h-8 w-[9rem]">
            <SelectValue placeholder="Filter kolom" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">Tanpa filter</SelectItem>
            {data.columns.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                Filter: {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {data.filter?.columnId && (
          <Input
            className="h-8 w-40"
            placeholder="Cari…"
            value={data.filter.query}
            onChange={(e) =>
              patch({ filter: { columnId: data.filter!.columnId, query: e.target.value } })
            }
          />
        )}
        <Select
          value={data.sort ? `${data.sort.columnId}:${data.sort.direction}` : '__none'}
          onValueChange={(value) => {
            if (value === '__none') {
              patch({ sort: null })
              return
            }
            const [columnId, direction] = value.split(':') as [string, 'asc' | 'desc']
            patch({ sort: { columnId, direction } })
          }}
        >
          <SelectTrigger className="h-8 w-[11rem]">
            <SelectValue placeholder="Urutkan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">Tanpa urutan</SelectItem>
            {data.columns.flatMap((c) => [
              <SelectItem key={`${c.id}-asc`} value={`${c.id}:asc`}>
                {c.name} ↑
              </SelectItem>,
              <SelectItem key={`${c.id}-desc`} value={`${c.id}:desc`}>
                {c.name} ↓
              </SelectItem>,
            ])}
          </SelectContent>
        </Select>
      </div>

      {data.view === 'table' && (
        <div className="overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/60">
                {data.columns.map((col) => (
                  <th
                    key={col.id}
                    className="min-w-[9rem] border-b border-border p-2 text-left align-top"
                  >
                    <Input
                      value={col.name}
                      onChange={(e) => updateColumn(col.id, { name: e.target.value })}
                      className="mb-1 h-8"
                      aria-label="Nama kolom"
                    />
                    <Select
                      value={col.type}
                      onValueChange={(value) => setColumnType(col, value as DbColumnType)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Teks</SelectItem>
                        <SelectItem value="number">Angka</SelectItem>
                        <SelectItem value="select">Select</SelectItem>
                        <SelectItem value="multi_select">Multi-select</SelectItem>
                        <SelectItem value="checkbox">Checkbox</SelectItem>
                        <SelectItem value="date">Tanggal</SelectItem>
                        <SelectItem value="relation">Relation</SelectItem>
                        <SelectItem value="formula">Formula</SelectItem>
                        <SelectItem value="rollup">Rollup</SelectItem>
                      </SelectContent>
                    </Select>
                    {(col.type === 'select' || col.type === 'multi_select') && (
                      <div className="mt-1.5 space-y-1">
                        <div className="flex flex-wrap gap-1">
                          {(col.options ?? []).map((opt) => (
                            <span
                              key={opt}
                              className="inline-flex items-center gap-0.5 rounded-md bg-muted px-1.5 py-0.5 text-[10px]"
                            >
                              {opt}
                              <button
                                type="button"
                                className="text-muted-foreground hover:text-destructive"
                                onClick={() => removeOption(col, opt)}
                                aria-label={`Hapus ${opt}`}
                              >
                                <X className="size-2.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-1">
                          <Input
                            className="h-7 text-[11px]"
                            placeholder="Opsi baru…"
                            value={optionDraft[col.id] ?? ''}
                            onChange={(e) =>
                              setOptionDraft((prev) => ({
                                ...prev,
                                [col.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                addOption(col)
                              }
                            }}
                          />
                          <Button
                            type="button"
                            size="icon-xs"
                            variant="secondary"
                            onClick={() => addOption(col)}
                          >
                            <Plus className="size-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                    {col.type === 'relation' && (
                      <Select
                        value={col.relationKind ?? 'any'}
                        onValueChange={(v) =>
                          updateColumn(col.id, {
                            relationKind: v as 'page' | 'task' | 'any',
                          })
                        }
                      >
                        <SelectTrigger className="mt-1 h-7 text-[11px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Page / Task</SelectItem>
                          <SelectItem value="page">Page saja</SelectItem>
                          <SelectItem value="task">Task saja</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    {col.type === 'formula' && (
                      <Input
                        className="mt-1 h-7 font-mono text-[10px]"
                        placeholder="{Harga} * {Qty}"
                        value={col.formula ?? ''}
                        onChange={(e) =>
                          updateColumn(col.id, { formula: e.target.value })
                        }
                        title="Pakai {Nama kolom} — hanya angka + - * / ( )"
                      />
                    )}
                    {col.type === 'rollup' && (
                      <div className="mt-1 space-y-1">
                        <Select
                          value={col.rollupRelationColumnId ?? '__none'}
                          onValueChange={(v) =>
                            updateColumn(col.id, {
                              rollupRelationColumnId:
                                v === '__none' ? undefined : v,
                            })
                          }
                        >
                          <SelectTrigger className="h-7 text-[11px]">
                            <SelectValue placeholder="Kolom sumber" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none">—</SelectItem>
                            {data.columns
                              .filter(
                                (c) =>
                                  c.id !== col.id &&
                                  (c.type === 'relation' ||
                                    c.type === 'multi_select'),
                              )
                              .map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={col.rollupProperty ?? 'title'}
                          onValueChange={(v) =>
                            updateColumn(col.id, {
                              rollupProperty: v as DbRollupProperty,
                            })
                          }
                        >
                          <SelectTrigger className="h-7 text-[11px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="title">Title</SelectItem>
                            <SelectItem value="due">Due</SelectItem>
                            <SelectItem value="priority">Priority</SelectItem>
                            <SelectItem value="status">Status</SelectItem>
                            <SelectItem value="count">Count</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </th>
                ))}
                <th className="w-10 border-b border-border" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  {data.columns.map((col) => (
                    <td key={col.id} className="border-b border-border p-2 align-top">
                      {renderCell(row, col, updateCell, {
                        columns: data.columns,
                        pages: livePages,
                        tasks: rootTasks,
                        onOpenPage,
                        onOpenTask,
                      })}
                    </td>
                  ))}
                  <td className="border-b border-border p-1">
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      onClick={() => removeRow(row.id)}
                    >
                      ×
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.view === 'board' && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-2.5 p-3">
          {!boardCol && (
            <p className="col-span-full text-sm text-muted-foreground">
              Tambah kolom bertipe Select untuk board.
            </p>
          )}
          {groups.map((group) => (
            <div
              key={group.name}
              className="flex min-h-28 flex-col gap-2 rounded-lg bg-muted/50 p-2"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => dropOnStatus(group.name)}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>{group.name}</span>
                <span>{group.rows.length}</span>
              </div>
              {group.rows.map((row) => (
                <Card
                  key={row.id}
                  className="cursor-grab gap-2 p-2 shadow-none active:cursor-grabbing"
                  draggable
                  onDragStart={() => setDragRowId(row.id)}
                  onDragEnd={() => setDragRowId(null)}
                >
                  {data.columns
                    .filter((c) => c.id !== boardCol?.id)
                    .slice(0, 3)
                    .map((col) => (
                      <div key={col.id} className="space-y-1">
                        <div className="text-[0.7rem] text-muted-foreground">{col.name}</div>
                        {renderCell(row, col, updateCell, {
                          columns: data.columns,
                          pages: livePages,
                          tasks: rootTasks,
                          onOpenPage,
                          onOpenTask,
                        })}
                      </div>
                    ))}
                </Card>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={() => {
                  const row = emptyRow(data.columns)
                  if (boardCol) row.cells[boardCol.id] = group.name
                  patch({ rows: [...data.rows, row] })
                }}
              >
                + Kartu
              </Button>
            </div>
          ))}
          {ungrouped.length > 0 && (
            <div className="rounded-lg bg-muted/50 p-2">
              <div className="mb-2 text-xs font-semibold text-muted-foreground">Lainnya</div>
              {ungrouped.map((row) => (
                <Card key={row.id} className="mb-2 p-2 text-sm shadow-none">
                  {String(Object.values(row.cells)[0] ?? 'Item')}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {data.view === 'list' && (
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center gap-2 px-3 py-2">
              <div className="min-w-0 flex-1 truncate text-sm font-medium">
                {String(row.cells[nameCol?.id ?? ''] ?? 'Item')}
              </div>
              {boardCol && (
                <Select
                  value={String(row.cells[boardCol.id] ?? '')}
                  onValueChange={(v) => updateCell(row.id, boardCol.id, v)}
                >
                  <SelectTrigger className="h-8 w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(boardCol.options ?? []).map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                onClick={() => removeRow(row.id)}
              >
                ×
              </Button>
            </li>
          ))}
        </ul>
      )}

      {data.view === 'gallery' && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-2.5 p-3">
          {rows.map((row) => (
            <Card key={row.id} className="gap-2 overflow-hidden p-0 shadow-none">
              <div className="h-16 bg-gradient-to-br from-primary/20 via-muted to-muted/40" />
              <div className="space-y-2 p-3 pt-0">
                {nameCol && (
                  <Input
                    className="h-8 border-0 bg-transparent px-0 font-semibold shadow-none focus-visible:ring-0"
                    value={String(row.cells[nameCol.id] ?? '')}
                    onChange={(e) => updateCell(row.id, nameCol.id, e.target.value)}
                    placeholder="Judul…"
                  />
                )}
                {data.columns
                  .filter((c) => c.id !== nameCol?.id)
                  .slice(0, 3)
                  .map((col) => (
                    <div key={col.id} className="space-y-0.5">
                      <div className="text-[10px] font-medium text-muted-foreground">
                        {col.name}
                      </div>
                      {renderCell(row, col, updateCell, {
                        columns: data.columns,
                        pages: livePages,
                        tasks: rootTasks,
                        onOpenPage,
                        onOpenTask,
                      })}
                    </div>
                  ))}
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => removeRow(row.id)}
                >
                  Hapus
                </Button>
              </div>
            </Card>
          ))}
          <button
            type="button"
            className="flex min-h-[8rem] items-center justify-center rounded-xl border border-dashed border-border text-[13px] text-muted-foreground hover:bg-muted/40"
            onClick={addRow}
          >
            <Plus className="mr-1 size-4" /> Kartu baru
          </button>
        </div>
      )}

      {data.view === 'calendar' && (
        <div className="p-3">
          {!dateCol ? (
            <p className="text-sm text-muted-foreground">
              Tambah kolom bertipe Tanggal untuk kalender.
            </p>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="flex size-7 items-center justify-center rounded-md hover:bg-muted"
                  onClick={() =>
                    setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
                  }
                  aria-label="Bulan sebelumnya"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <span className="text-[13px] font-semibold capitalize">{monthLabel}</span>
                <button
                  type="button"
                  className="flex size-7 items-center justify-center rounded-md hover:bg-muted"
                  onClick={() =>
                    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
                  }
                  aria-label="Bulan berikutnya"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border">
                {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d) => (
                  <div
                    key={d}
                    className="bg-muted/40 px-1 py-1.5 text-center text-[10px] font-medium text-muted-foreground"
                  >
                    {d}
                  </div>
                ))}
                {cells.map((day, i) => {
                  const iso =
                    day != null
                      ? `${monthKey}-${String(day).padStart(2, '0')}`
                      : null
                  const dayRows = iso
                    ? rows.filter((r) => String(r.cells[dateCol.id] ?? '') === iso)
                    : []
                  const todayIso = new Date().toISOString().slice(0, 10)
                  return (
                    <div
                      key={iso ?? `e-${i}`}
                      className={cn(
                        'min-h-16 bg-background p-1',
                        iso === todayIso && 'bg-primary/10',
                      )}
                      onDragOver={(e) => {
                        if (iso) e.preventDefault()
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        const id = e.dataTransfer.getData('text/db-row')
                        if (id && iso && dateCol) updateCell(id, dateCol.id, iso)
                      }}
                    >
                      {day != null && (
                        <>
                          <div
                            className={cn(
                              'mb-0.5 text-[11px] tabular-nums text-muted-foreground',
                              iso === todayIso && 'font-semibold text-primary',
                            )}
                          >
                            {day}
                          </div>
                          <ul className="flex flex-col gap-0.5">
                            {dayRows.slice(0, 3).map((row) => (
                              <li key={row.id}>
                                <button
                                  type="button"
                                  draggable
                                  className="w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium hover:bg-muted"
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData('text/db-row', row.id)
                                  }}
                                  title={String(row.cells[nameCol?.id ?? ''] ?? '')}
                                >
                                  {String(row.cells[nameCol?.id ?? ''] ?? '•')}
                                </button>
                              </li>
                            ))}
                            {dayRows.length > 3 && (
                              <li className="px-1 text-[9px] text-muted-foreground">
                                +{dayRows.length - 3}
                              </li>
                            )}
                          </ul>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  )
}

function renderCell(
  row: DbRow,
  col: DbColumn,
  updateCell: (rowId: string, colId: string, value: string | boolean | number) => void,
  ctx: {
    columns: DbColumn[]
    pages: Page[]
    tasks: Task[]
    onOpenPage?: (pageId: string) => void
    onOpenTask?: (taskId: string) => void
  },
) {
  const value = row.cells[col.id]
  if (col.type === 'checkbox') {
    return (
      <Checkbox
        checked={Boolean(value)}
        onCheckedChange={(checked) => updateCell(row.id, col.id, Boolean(checked))}
      />
    )
  }
  if (col.type === 'select') {
    return (
      <Select
        value={String(value ?? '')}
        onValueChange={(next) => updateCell(row.id, col.id, next)}
      >
        <SelectTrigger className="h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(col.options ?? []).map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }
  if (col.type === 'multi_select') {
    const selected = parseMultiSelect(value)
    return (
      <div className="flex flex-wrap gap-1">
        {(col.options ?? []).map((opt) => {
          const on = selected.includes(opt)
          return (
            <button
              key={opt}
              type="button"
              className={cn(
                'rounded-md px-1.5 py-0.5 text-[11px] transition-colors',
                on
                  ? 'bg-primary/20 font-medium text-primary'
                  : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
              onClick={() => {
                const next = on
                  ? selected.filter((s) => s !== opt)
                  : [...selected, opt]
                updateCell(row.id, col.id, formatMultiSelect(next))
              }}
            >
              {opt}
            </button>
          )
        })}
      </div>
    )
  }
  if (col.type === 'number') {
    return (
      <Input
        type="number"
        className="h-8"
        value={Number(value ?? 0)}
        onChange={(e) => updateCell(row.id, col.id, Number(e.target.value))}
      />
    )
  }
  if (col.type === 'date') {
    return (
      <DatePickerField
        value={value ? String(value) : null}
        onChange={(next) => updateCell(row.id, col.id, next ?? '')}
        className="h-8"
      />
    )
  }
  if (col.type === 'relation') {
    const rel = parseRelation(value)
    const kind = col.relationKind ?? 'any'
    const pageOpts = kind === 'task' ? [] : ctx.pages
    const taskOpts = kind === 'page' ? [] : ctx.tasks
    return (
      <div className="flex flex-col gap-1">
        <Select
          value={value ? String(value) : '__none'}
          onValueChange={(next) =>
            updateCell(row.id, col.id, next === '__none' ? '' : next)
          }
        >
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Pilih…" />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            <SelectItem value="__none">—</SelectItem>
            {pageOpts.map((p) => (
              <SelectItem key={`page:${p.id}`} value={formatRelation('page', p.id)}>
                {p.icon} {p.title || 'Tanpa judul'}
              </SelectItem>
            ))}
            {taskOpts.map((t) => (
              <SelectItem key={`task:${t.id}`} value={formatRelation('task', t.id)}>
                ☐ {t.title || 'Tanpa judul'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {rel.kind === 'page' && rel.id && ctx.onOpenPage && (
          <button
            type="button"
            className="text-left text-[11px] text-primary hover:underline"
            onClick={() => ctx.onOpenPage?.(rel.id!)}
          >
            Buka halaman
          </button>
        )}
        {rel.kind === 'task' && rel.id && ctx.onOpenTask && (
          <button
            type="button"
            className="text-left text-[11px] text-primary hover:underline"
            onClick={() => ctx.onOpenTask?.(rel.id!)}
          >
            Buka tugas
          </button>
        )}
      </div>
    )
  }
  if (col.type === 'formula') {
    return (
      <span className="block px-1 font-mono text-xs tabular-nums text-muted-foreground">
        {evalFormula(col.formula ?? '', ctx.columns, row.cells)}
      </span>
    )
  }
  if (col.type === 'rollup') {
    return (
      <span className="block truncate px-1 text-xs text-muted-foreground">
        {evalRollup(col, row.cells, ctx.columns, {
          pages: ctx.pages,
          tasks: ctx.tasks,
        })}
      </span>
    )
  }
  return (
    <Input
      type="text"
      className="h-8"
      value={String(value ?? '')}
      onChange={(e) => updateCell(row.id, col.id, e.target.value)}
    />
  )
}
