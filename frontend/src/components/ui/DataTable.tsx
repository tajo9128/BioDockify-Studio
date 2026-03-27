import { clsx } from 'clsx'

interface DataTableProps {
  columns: Array<{ key: string; label: string; width?: string }>
  data: Record<string, any>[]
  emptyMessage?: string
  className?: string
  onRowClick?: (row: Record<string, any>) => void
}

export function DataTable({
  columns,
  data,
  emptyMessage = 'No data available',
  className,
  onRowClick,
}: DataTableProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-text-tertiary">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={clsx('overflow-x-auto', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-light">
            {columns.map((col) => (
              <th
                key={col.key}
                className="text-left px-4 py-3 font-semibold text-text-secondary"
                style={{ width: col.width }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              onClick={() => onRowClick?.(row)}
              className={clsx(
                'border-b border-border-light last:border-0',
                onRowClick && 'cursor-pointer hover:bg-surface-secondary transition-colors'
              )}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-text-primary">
                  {row[col.key] ?? '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
