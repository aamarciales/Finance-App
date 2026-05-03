import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Category } from '@/types/domain'

interface TxFiltersProps {
  categories: Category[]
  period: string
  onPeriodChange: (value: string) => void
  categoryId: string
  onCategoryChange: (value: string) => void
  search: string
  onSearchChange: (value: string) => void
}

const PERIODS = [
  { value: 'this-month', label: 'Este mes' },
  { value: 'last-month', label: 'Mes anterior' },
  { value: 'last-3-months', label: 'Últimos 3 meses' },
  { value: 'all', label: 'Todo' },
]

export function TxFilters({
  categories,
  period,
  onPeriodChange,
  categoryId,
  onCategoryChange,
  search,
  onSearchChange,
}: TxFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={period} onValueChange={onPeriodChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Periodo" />
        </SelectTrigger>
        <SelectContent>
          {PERIODS.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={categoryId} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Categoría" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={String(c.id)}>
              <span className="flex items-center gap-2">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: c.color }}
                />
                {c.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="relative flex-1 min-w-[180px]">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint" />
        <Input
          placeholder="Buscar por concepto…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
    </div>
  )
}

/** Build YYYY-MM-DD from local year/month/day without UTC conversion. */
function localDateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Convierte el valor del select de periodo a rango de fechas ISO. */
export function periodToDates(
  period: string,
): { start?: string; end?: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()

  switch (period) {
    case 'this-month':
      return {
        start: localDateStr(y, m, 1),
        end: localDateStr(y, m, new Date(y, m + 1, 0).getDate()),
      }
    case 'last-month':
      return {
        start: localDateStr(y, m - 1, 1),
        end: localDateStr(y, m - 1, new Date(y, m, 0).getDate()),
      }
    case 'last-3-months':
      return {
        start: localDateStr(y, m - 2, 1),
        end: localDateStr(y, m, new Date(y, m + 1, 0).getDate()),
      }
    default:
      return {}
  }
}
