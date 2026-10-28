import { useState } from 'react'
import type { DatabaseData, DbColumn, DbColumnType, DbRow, DbView } from '@/types'
import { dateColumn, emptyColumn, emptyRow, titleColumn, visibleRows } from '@/lib/database'
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

type Props = {
  title: string
  data: DatabaseData
  onChangeTitle: (title: string) => void
  onChange: (data: DatabaseData) => void
  onDeleteBlock: () => void
}

export function DatabaseBlock({ title, data, onChangeTitle, onChange, onDeleteBlock }: Props) {
  const [dragRowId, setDragRowId] = useState<string | null>(null)
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
      options: type === 'select' ? col.options ?? ['Todo', 'Doing', 'Done'] : undefined,
    })
    if (type === 'date' && !data.dateColumnId) patch({ dateColumnId: col.id })
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

  const monthKey = new Date().toISOString().slice(0, 7)
  const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1).filter((d) => {
    const dt = new Date(`${monthKey}-${String(d).padStart(2, '0')}T12:00:00`)
    return !Number.isNaN(dt.getTime()) && dt.toISOString().slice(0, 7) === monthKey
  })

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
                  <th key={col.id} className="min-w-[8rem] border-b border-border p-2 text-left align-top">
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
                        <SelectItem value="checkbox">Checkbox</SelectItem>
                        <SelectItem value="date">Tanggal</SelectItem>
                      </SelectContent>
                    </Select>
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
                      {renderCell(row, col, updateCell)}
                    </td>
                  ))}
                  <td className="border-b border-border p-1">
                    <Button type="button" size="icon-xs" variant="ghost" onClick={() => removeRow(row.id)}>
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
                        {renderCell(row, col, updateCell)}
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
              <Button type="button" size="icon-xs" variant="ghost" onClick={() => removeRow(row.id)}>
                ×
              </Button>
            </li>
          ))}
        </ul>
      )}

      {data.view === 'gallery' && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-2.5 p-3">
          {rows.map((row) => (
            <Card key={row.id} className="gap-2 p-3 shadow-none">
              <div className="text-sm font-semibold">
                {String(row.cells[nameCol?.id ?? ''] ?? 'Item')}
              </div>
              {data.columns
                .filter((c) => c.id !== nameCol?.id)
                .slice(0, 3)
                .map((col) => (
                  <div key={col.id} className="text-xs text-muted-foreground">
                    {col.name}: {String(row.cells[col.id] ?? '—')}
                  </div>
                ))}
            </Card>
          ))}
        </div>
      )}

      {data.view === 'calendar' && (
        <div className="p-3">
          {!dateCol ? (
            <p className="text-sm text-muted-foreground">Tambah kolom bertipe Tanggal untuk kalender.</p>
          ) : (
            <>
              <div className="mb-2 text-sm font-medium">{monthKey}</div>
              <div className="grid grid-cols-7 gap-1.5">
                {daysInMonth.map((day) => {
                  const iso = `${monthKey}-${String(day).padStart(2, '0')}`
                  const dayRows = rows.filter((r) => String(r.cells[dateCol.id] ?? '') === iso)
                  return (
                    <div key={iso} className="min-h-16 rounded-md border border-border/70 p-1.5">
                      <div className="text-[0.65rem] text-muted-foreground">{day}</div>
                      {dayRows.slice(0, 3).map((row) => (
                        <div key={row.id} className="truncate text-[0.7rem] font-medium">
                          {String(row.cells[nameCol?.id ?? ''] ?? '•')}
                        </div>
                      ))}
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
      <Select value={String(value ?? '')} onValueChange={(next) => updateCell(row.id, col.id, next)}>
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
  return (
    <Input
      type="text"
      className="h-8"
      value={String(value ?? '')}
      onChange={(e) => updateCell(row.id, col.id, e.target.value)}
    />
  )
}
