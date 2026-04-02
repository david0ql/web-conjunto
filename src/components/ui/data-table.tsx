import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Button } from './button'
import { Input } from './input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'
import { cn } from '@/lib/utils'

export interface ColumnDef<T> {
  id?: string
  header: string
  cell: (row: T) => React.ReactNode
  className?: string
}

export interface FilterDef {
  key: string
  placeholder: string
  options: { value: string; label: string }[]
  type?: 'select' | 'period'
}

function matchesPeriod(dateStr: string, period: string): boolean {
  const date = new Date(dateStr)
  const now = new Date()
  if (period === 'today') {
    return date.toDateString() === now.toDateString()
  }
  const days: Record<string, number> = { week: 7, month: 30, quarter: 90 }
  const d = days[period]
  if (!d) return true
  return date >= new Date(now.getTime() - d * 86_400_000)
}

interface DataTableProps<T extends { id: string }> {
  data: T[]
  columns: ColumnDef<T>[]
  searchPlaceholder?: string
  getSearchText?: (row: T) => string
  filters?: FilterDef[]
  getFilterValues?: (row: T) => Record<string, string>
  pageSize?: number
  emptyMessage?: string
  isLoading?: boolean
}

const DEFAULT_PAGE_SIZE = 15

export function DataTable<T extends { id: string }>({
  data,
  columns,
  searchPlaceholder = 'Buscar...',
  getSearchText,
  filters,
  getFilterValues,
  pageSize = DEFAULT_PAGE_SIZE,
  emptyMessage = 'Sin resultados.',
  isLoading,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    let result = data

    if (search.trim() && getSearchText) {
      const q = search.toLowerCase().trim()
      result = result.filter((row) => getSearchText(row).toLowerCase().includes(q))
    }

    if (getFilterValues) {
      for (const [key, value] of Object.entries(activeFilters)) {
        if (!value) continue
        const def = filters?.find((f) => f.key === key)
        if (def?.type === 'period') {
          result = result.filter((row) => {
            const dateStr = getFilterValues(row)[key]
            return dateStr ? matchesPeriod(dateStr, value) : false
          })
        } else {
          result = result.filter((row) => getFilterValues(row)[key] === value)
        }
      }
    }

    return result
  }, [data, search, activeFilters, getSearchText, getFilterValues, filters])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const handleFilter = (key: string, value: string) => {
    setActiveFilters((prev) => ({ ...prev, [key]: value === '__all__' ? '' : value }))
    setPage(1)
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9 text-sm"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        {filters?.map((filter) => (
          <Select
            key={filter.key}
            value={activeFilters[filter.key] ?? ''}
            onValueChange={(value) => handleFilter(filter.key, value)}
          >
            <SelectTrigger className="w-[160px] shrink-0 text-sm">
              <SelectValue placeholder={filter.placeholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{filter.placeholder}</SelectItem>
              {filter.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                {columns.map((col) => (
                  <th
                    key={col.id ?? col.header}
                    className={cn(
                      'px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500',
                      col.className,
                    )}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-slate-400">
                    Cargando...
                  </td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-slate-400">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                paged.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-slate-50/60">
                    {columns.map((col) => (
                      <td key={col.id ?? col.header} className={cn('px-4 py-3 text-slate-700', col.className)}>
                        {col.cell(row)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>
          {filtered.length === 0
            ? 'Sin resultados'
            : `${Math.min((currentPage - 1) * pageSize + 1, filtered.length)}–${Math.min(currentPage * pageSize, filtered.length)} de ${filtered.length}`}
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <span className="min-w-[60px] text-center text-[11px] font-medium text-slate-500">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
