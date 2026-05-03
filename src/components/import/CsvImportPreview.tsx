import { useState, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/common/Badge'
import { Money } from '@/components/common/Money'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { suggestCategory } from '@/lib/auto-categorize'
import type { ParsedTransaction, DetectedBank } from '@/lib/csv-parser'
import { BANK_LABELS } from '@/lib/csv-parser'
import type { Category } from '@/types/domain'

interface CsvRow extends ParsedTransaction {
  selected: boolean
  categoryId: number
}

interface CsvImportPreviewProps {
  transactions: ParsedTransaction[]
  bank: DetectedBank
  categories: Category[]
  onImport: (rows: Array<{ date: string; concept: string; amount: number; currency: 'COP' | 'USD' | 'EUR'; categoryId: number }>) => Promise<void>
  onClose: () => void
}

export function CsvImportPreview({ transactions, bank, categories, onImport, onClose }: CsvImportPreviewProps) {
  const [importing, setImporting] = useState(false)

  const categoryMap = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of categories) {
      m.set(c.name.toLowerCase(), c.id!)
    }
    return m
  }, [categories])

  const [rows, setRows] = useState<CsvRow[]>(() =>
    transactions.map(tx => {
      // First try explicit category from CSV, then fallback to concept heuristic
      const explicitCat = tx.originalData['Categoria']?.trim()?.toLowerCase()
      const suggested = suggestCategory(tx.concept)
      let catId: number | undefined
      if (explicitCat && categoryMap.has(explicitCat)) {
        catId = categoryMap.get(explicitCat)
      } else if (suggested) {
        catId = categoryMap.get(suggested.toLowerCase())
      }
      return {
        ...tx,
        selected: true,
        categoryId: catId ?? categories[0]?.id ?? 0,
      }
    })
  )

  const allSelected = rows.length > 0 && rows.every(r => r.selected)
  const selectedRows = rows.filter(r => r.selected)
  const incomeCount = selectedRows.filter(r => r.amount > 0).length
  const expenseCount = selectedRows.filter(r => r.amount < 0).length

  function toggleAll() {
    setRows(prev => prev.map(r => ({ ...r, selected: !allSelected })))
  }

  function toggleRow(index: number) {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, selected: !r.selected } : r))
  }

  function setCategory(index: number, catId: string) {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, categoryId: Number(catId) } : r))
  }

  async function handleImport() {
    setImporting(true)
    try {
      await onImport(selectedRows.map(r => ({
        date: r.date,
        concept: r.concept,
        amount: Math.abs(r.amount),
        currency: r.currency,
        categoryId: r.categoryId,
      })))
      onClose()
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge tone="info">Detectado: {BANK_LABELS[bank]}</Badge>
          <span className="text-[13px] text-text-muted">
            {rows.length} transacciones · {incomeCount} ingresos · {expenseCount} gastos
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button
            size="sm"
            onClick={handleImport}
            disabled={importing || selectedRows.length === 0}
          >
            {importing ? 'Importando…' : `Importar ${selectedRows.length}`}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-surface">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-[0.06em] text-text-faint">
              <th className="w-10 px-3 py-2">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
              </th>
              <th className="py-2 pr-2 font-medium">Fecha</th>
              <th className="py-2 px-2 font-medium">Concepto</th>
              <th className="w-40 py-2 px-2 font-medium">Categoría</th>
              <th className="w-28 py-2 pl-2 pr-3 text-right font-medium">Monto</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              let dateLabel = row.date
              try {
                const d = parseISO(row.date)
                if (!isNaN(d.getTime())) dateLabel = format(d, 'dd MMM', { locale: es })
              } catch { /* keep raw */ }

              return (
                <tr
                  key={i}
                  className={`border-b border-border/30 ${!row.selected ? 'opacity-40' : ''}`}
                >
                  <td className="px-3 py-2">
                    <Checkbox checked={row.selected} onCheckedChange={() => toggleRow(i)} />
                  </td>
                  <td className="py-2 pr-2 font-mono text-[12px] text-text-muted">{dateLabel}</td>
                  <td className="py-2 px-2 truncate max-w-[200px]">{row.concept}</td>
                  <td className="py-2 px-2">
                    <Select value={String(row.categoryId)} onValueChange={v => setCategory(i, v)}>
                      <SelectTrigger className="h-7 text-[12px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(c => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-2 pl-2 pr-3 text-right font-mono">
                    <span className={row.amount >= 0 ? 'text-brand' : 'text-danger-strong'}>
                      {row.amount >= 0 ? '+' : ''}
                      <Money amount={Math.abs(row.amount)} currency={row.currency} variant="inline" />
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
