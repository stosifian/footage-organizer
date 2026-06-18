import { useMemo, useRef } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type SortingState
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useState } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { createColumns } from './columns'
import type { ClipData } from '../../types/clip'

interface Props {
  clips: ClipData[]
  directory: string
  globalFilter: string
  onPreview: (clip: ClipData) => void
  hasActiveFilters?: boolean
}

export function ClipTable({ clips, directory, globalFilter, onPreview, hasActiveFilters }: Props) {
  const [sorting, setSorting] = useState<SortingState>([])
  const parentRef = useRef<HTMLDivElement>(null)

  const columns = useMemo(() => createColumns(directory, onPreview), [directory, onPreview])

  const table = useReactTable({
    data: clips,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    columnResizeMode: 'onChange',
    enableColumnResizing: true
  })

  const { rows } = table.getRowModel()

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 10
  })

  return (
    <div ref={parentRef} className="flex-1 overflow-auto">
      <table className="border-collapse" style={{ tableLayout: 'fixed', width: table.getTotalSize() }}>
        <thead className="sticky top-0 z-10 bg-[#1a1a1a]">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-3 py-2 text-left text-xs font-medium text-[#999] border-b border-[#333] whitespace-nowrap relative"
                  style={{ width: header.getSize() }}
                >
                  {header.isPlaceholder ? null : (
                    <div className="flex items-center justify-between">
                      <button
                        className={`flex items-center gap-1 ${
                          header.column.getCanSort() ? 'cursor-pointer select-none hover:text-[#e5e5e5]' : ''
                        }`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <>
                            {header.column.getIsSorted() === 'asc' ? (
                              <ArrowUp size={12} />
                            ) : header.column.getIsSorted() === 'desc' ? (
                              <ArrowDown size={12} />
                            ) : (
                              <ArrowUpDown size={12} className="opacity-30" />
                            )}
                          </>
                        )}
                      </button>
                      {header.column.getCanResize() && (
                        <div
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          className={`w-1 h-full cursor-col-resize select-none touch-none absolute right-0 top-0 bottom-0 hover:bg-blue-500 ${
                            header.column.getIsResizing() ? 'bg-blue-500' : 'bg-transparent'
                          }`}
                        />
                      )}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {virtualizer.getVirtualItems().length > 0 && (
            <tr>
              <td
                colSpan={columns.length}
                style={{ height: virtualizer.getVirtualItems()[0]?.start ?? 0, padding: 0 }}
              />
            </tr>
          )}
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index]
            return (
              <tr
                key={row.id}
                ref={virtualizer.measureElement}
                data-index={virtualRow.index}
                className={`border-b border-[#252525] hover:bg-[#1a1a1a] transition-colors ${row.original.missing ? 'opacity-50' : ''}`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-3 py-2"
                    style={{ width: cell.column.getSize() }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            )
          })}
          {virtualizer.getVirtualItems().length > 0 && (
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  height:
                    virtualizer.getTotalSize() -
                    (virtualizer.getVirtualItems().at(-1)?.end ?? 0),
                  padding: 0
                }}
              />
            </tr>
          )}
        </tbody>
      </table>

      {rows.length === 0 && (
        <div className="flex items-center justify-center h-32 text-[#666] text-sm">
          {globalFilter || hasActiveFilters ? 'No clips match your filters.' : 'No video clips found.'}
        </div>
      )}
    </div>
  )
}
