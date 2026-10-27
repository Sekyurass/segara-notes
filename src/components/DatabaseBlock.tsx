import type { DatabaseData, DbColumn, DbColumnType, DbRow } from '../types'
import { emptyColumn, emptyRow } from '../lib/database'

type Props = {
  title: string
  data: DatabaseData
  onChangeTitle: (title: string) => void
  onChange: (data: DatabaseData) => void
  onDeleteBlock: () => void
}

export function DatabaseBlock({ title, data, onChangeTitle, onChange, onDeleteBlock }: Props) {
  const boardCol =
    data.columns.find((c) => c.id === data.boardColumnId && c.type === 'select') ??
    data.columns.find((c) => c.type === 'select')

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
  }

  const groups =
    boardCol?.options?.map((opt) => ({
      name: opt,
      rows: data.rows.filter((r) => String(r.cells[boardCol.id] ?? '') === opt),
    })) ?? []

  const ungrouped =
    boardCol != null
      ? data.rows.filter((r) => !boardCol.options?.includes(String(r.cells[boardCol.id] ?? '')))
      : []

  return (
    <div className="db-block">
      <div className="db-toolbar">
        <input
          className="db-title"
          value={title}
          onChange={(e) => onChangeTitle(e.target.value)}
          aria-label="Judul database"
        />
        <div className="db-toolbar-actions">
          <button
            type="button"
            className={data.view === 'table' ? 'active' : ''}
            onClick={() => patch({ view: 'table' })}
          >
            Tabel
          </button>
          <button
            type="button"
            className={data.view === 'board' ? 'active' : ''}
            onClick={() =>
              patch({
                view: 'board',
                boardColumnId: boardCol?.id ?? data.columns.find((c) => c.type === 'select')?.id,
              })
            }
          >
            Board
          </button>
          <button type="button" onClick={addRow}>
            + Baris
          </button>
          <button type="button" onClick={addColumn}>
            + Kolom
          </button>
          <button type="button" className="danger" onClick={onDeleteBlock}>
            Hapus
          </button>
        </div>
      </div>

      {data.view === 'table' ? (
        <div className="db-table-wrap">
          <table className="db-table">
            <thead>
              <tr>
                {data.columns.map((col) => (
                  <th key={col.id}>
                    <input
                      value={col.name}
                      onChange={(e) => updateColumn(col.id, { name: e.target.value })}
                      aria-label="Nama kolom"
                    />
                    <select
                      value={col.type}
                      onChange={(e) => setColumnType(col, e.target.value as DbColumnType)}
                      aria-label="Tipe kolom"
                    >
                      <option value="text">Teks</option>
                      <option value="number">Angka</option>
                      <option value="select">Select</option>
                      <option value="checkbox">Checkbox</option>
                    </select>
                  </th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.id}>
                  {data.columns.map((col) => (
                    <td key={col.id}>{renderCell(row, col, updateCell)}</td>
                  ))}
                  <td>
                    <button type="button" className="db-row-del" onClick={() => removeRow(row.id)}>
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="db-board">
          {!boardCol && <p className="db-hint">Tambah kolom bertipe Select untuk board.</p>}
          {groups.map((group) => (
            <div key={group.name} className="db-board-col">
              <div className="db-board-head">
                {group.name} <span>{group.rows.length}</span>
              </div>
              {group.rows.map((row) => (
                <div key={row.id} className="db-card">
                  {data.columns
                    .filter((c) => c.id !== boardCol?.id)
                    .slice(0, 3)
                    .map((col) => (
                      <div key={col.id} className="db-card-field">
                        <span>{col.name}</span>
                        {renderCell(row, col, updateCell)}
                      </div>
                    ))}
                  <select
                    value={String(row.cells[boardCol!.id] ?? '')}
                    onChange={(e) => updateCell(row.id, boardCol!.id, e.target.value)}
                  >
                    {boardCol!.options!.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              <button
                type="button"
                className="db-add-card"
                onClick={() => {
                  const row = emptyRow(data.columns)
                  if (boardCol) row.cells[boardCol.id] = group.name
                  patch({ rows: [...data.rows, row] })
                }}
              >
                + Kartu
              </button>
            </div>
          ))}
          {ungrouped.length > 0 && (
            <div className="db-board-col">
              <div className="db-board-head">Lainnya</div>
              {ungrouped.map((row) => (
                <div key={row.id} className="db-card">
                  {String(Object.values(row.cells)[0] ?? 'Item')}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
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
      <input
        type="checkbox"
        checked={Boolean(value)}
        onChange={(e) => updateCell(row.id, col.id, e.target.checked)}
      />
    )
  }
  if (col.type === 'select') {
    return (
      <select
        value={String(value ?? '')}
        onChange={(e) => updateCell(row.id, col.id, e.target.value)}
      >
        {(col.options ?? []).map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    )
  }
  if (col.type === 'number') {
    return (
      <input
        type="number"
        value={Number(value ?? 0)}
        onChange={(e) => updateCell(row.id, col.id, Number(e.target.value))}
      />
    )
  }
  return (
    <input
      type="text"
      value={String(value ?? '')}
      onChange={(e) => updateCell(row.id, col.id, e.target.value)}
    />
  )
}
