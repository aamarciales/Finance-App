import { useState, useMemo } from 'react'
import { Loader2, ScanLine, FileSpreadsheet } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/lib/api'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { ImageDropzone } from '@/components/import/ImageDropzone'
import { CsvDropzone } from '@/components/import/CsvDropzone'
import { OcrPreviewDialog } from '@/components/import/OcrPreviewDialog'
import { CsvImportPreview } from '@/components/import/CsvImportPreview'
import { processReceiptOCR, type OcrResult } from '@/lib/ocr'
import { detectBank, parseCSV, type ParsedTransaction, type DetectedBank } from '@/lib/csv-parser'
import { getEquivalentAmounts } from '@/lib/currency'
import { useTRM } from '@/hooks/useTRM'
import { useForex } from '@/hooks/useForex'
import { useInvoices, type InvoiceFormData } from '@/hooks/useInvoices'

import type { Category } from '@/types/domain'

const NEW_CATEGORY_PALETTE = [
  { color: '#06B6D4', icon: 'tag' },
  { color: '#A855F7', icon: 'sparkles' },
  { color: '#F43F5E', icon: 'flame' },
  { color: '#84CC16', icon: 'leaf' },
  { color: '#FB923C', icon: 'zap' },
  { color: '#EAB308', icon: 'star' },
  { color: '#0891B2', icon: 'package' },
  { color: '#D946EF', icon: 'wand-2' },
]

export default function ImportPage() {
  const { rate: trm } = useTRM()
  const { eurToUsd } = useForex()
  const rates = useMemo(() => ({ trm, eurToUsd }), [trm, eurToUsd])
  const { addInvoice } = useInvoices()
  const api = useApi()
  const queryClient = useQueryClient()

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/categories'),
  })
  
  const categories = categoriesData ?? []

  // OCR state
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null)

  // CSV state
  const [csvFileName, setCsvFileName] = useState<string | null>(null)
  const [csvParsed, setCsvParsed] = useState<ParsedTransaction[] | null>(null)
  const [detectedBank, setDetectedBank] = useState<DetectedBank>('unknown')

  // --- OCR handlers ---

  function handleImageAccepted(file: File) {
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setOcrResult(null)
  }

  function clearImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImageFile(null)
    setImagePreview(null)
    setOcrResult(null)
  }

  async function handleProcessOCR() {
    if (!imageFile) return
    setProcessing(true)
    try {
      const result = await processReceiptOCR(imageFile)
      setOcrResult(result)
    } catch {
      toast.error('Error al procesar la imagen')
    } finally {
      setProcessing(false)
    }
  }

  async function handleSaveInvoice(data: InvoiceFormData) {
    await addInvoice(data)
    clearImage()
  }

  // --- CSV handlers ---

  function handleCsvAccepted(text: string, filename: string) {
    setCsvFileName(filename)
    const bank = detectBank(text)
    setDetectedBank(bank)
    if (bank === 'unknown') {
      toast.error('No se pudo detectar el banco. Verifica el formato del CSV.')
      return
    }
    const parsed = parseCSV(text, bank)
    if (parsed.length === 0) {
      toast.error('No se encontraron transacciones en el archivo.')
      return
    }
    setCsvParsed(parsed)
  }

  function clearCsv() {
    setCsvFileName(null)
    setCsvParsed(null)
    setDetectedBank('unknown')
  }

  async function handleImportCsv(rows: Array<{ date: string; concept: string; amount: number; originalAmount: number; currency: 'COP' | 'USD' | 'EUR'; categoryId: number; newCategoryName?: string }>) {
    const createdCategories = new Map<number, number>() // tempId -> realId
    const uniqueNewCats = new Map<number, { name: string, isIncome: boolean }>()

    // Identificar categorías nuevas a crear y si son de ingresos o gastos
    for (const row of rows) {
      if (row.newCategoryName && !uniqueNewCats.has(row.categoryId)) {
        // Determine if the new category is income or expense by looking at
        // the CSV row that introduced it. Fallback to name-based heuristic.
        let isIncome = false
        for (const r of rows) {
          if (r.newCategoryName === row.newCategoryName) {
            if (r.originalAmount > 0) { isIncome = true; break }
            break
          }
        }
        // Name-based safety net: words clearly indicating income
        if (!isIncome) {
          const lower = row.newCategoryName.toLowerCase()
          if (
            lower.includes('ingreso') ||
            lower.includes('salario') ||
            lower.includes('adelanto') ||
            lower.includes('inversion')
          ) isIncome = true
        }
        uniqueNewCats.set(row.categoryId, { name: row.newCategoryName, isIncome })
      }
    }

    try {
      // Crear las nuevas categorías con paleta cíclica
      let paletteIndex = 0
      for (const [tempId, cat] of uniqueNewCats.entries()) {
        const styling = NEW_CATEGORY_PALETTE[paletteIndex % NEW_CATEGORY_PALETTE.length]!
        paletteIndex++
        const newCat = await api.post<Category>('/categories', {
          name: cat.name,
          color: styling.color,
          icon: styling.icon,
          type: cat.isIncome ? 'income' : 'expense'
        })
        createdCategories.set(tempId, newCat.id!)
      }

      if (uniqueNewCats.size > 0) {
        await queryClient.invalidateQueries({ queryKey: ['categories'] })
        toast.success(`Se crearon ${uniqueNewCats.size} nuevas categorías`)
      }
    } catch {
      toast.error('Error creando las nuevas categorías')
      return
    }

    const categoryMap = new Map<number, Category>()
    // Reconstruir el mapa con las categorías recién creadas incluidas
    const currentCategories = await api.get<Category[]>('/categories')
    for (const c of currentCategories) {
      if (c.id != null) categoryMap.set(c.id, c)
    }

    try {
      for (const row of rows) {
        const realCategoryId = row.newCategoryName ? createdCategories.get(row.categoryId)! : row.categoryId
        const cat = categoryMap.get(realCategoryId)
        
        let resolvedType: 'income' | 'expense' | 'debt_payment' | 'transfer' = 'expense'
        if (cat?.name === 'Deuda') resolvedType = 'debt_payment'
        else if (cat?.name === 'Transferencias') resolvedType = 'transfer'
        else if (cat?.type === 'income') resolvedType = 'income'
        
        const txTrm = rates.trm
        const { amountInBase, amountInSecondary } = getEquivalentAmounts(row.amount, row.currency, rates)

        await api.post('/transactions', {
          date: row.date,
          type: resolvedType,
          concept: row.concept,
          categoryId: realCategoryId,
          amount: row.amount,
          currency: row.currency,
          trm: txTrm,
          amountInBase,
          amountInSecondary,
        })
      }
      toast.success(`Importadas ${rows.length} transacciones`)
    } catch {
      toast.error('Ocurrió un error guardando las transacciones')
    }

    clearCsv()
  }

  return (
    <>
      <PageHeader
        title="Importar"
        subtitle="Sube fotos de facturas o extractos bancarios CSV"
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Section 1: OCR */}
        <section className="rounded-[10px] border border-border bg-surface p-6">
          <div className="mb-4 flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-text-muted" />
            <h2 className="font-serif text-lg">Escanear ticket o factura</h2>
          </div>

          <ImageDropzone
            onFileAccepted={handleImageAccepted}
            preview={imagePreview}
            onClear={clearImage}
          />

          {imageFile && !ocrResult && (
            <Button
              onClick={handleProcessOCR}
              disabled={processing}
              className="mt-4 w-full gap-2"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analizando…
                </>
              ) : (
                'Procesar con OCR'
              )}
            </Button>
          )}
        </section>

        {/* Section 2: CSV */}
        <section className="rounded-[10px] border border-border bg-surface p-6">
          <div className="mb-4 flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-text-muted" />
            <h2 className="font-serif text-lg">Importar extracto bancario</h2>
          </div>

          {!csvParsed ? (
            <CsvDropzone
              onFileAccepted={handleCsvAccepted}
              fileName={csvFileName}
              onClear={clearCsv}
            />
          ) : (
            <CsvImportPreview
              transactions={csvParsed}
              bank={detectedBank}
              categories={categories}
              onImport={handleImportCsv}
              onClose={clearCsv}
            />
          )}
        </section>
      </div>

      {/* OCR Preview Dialog */}
      {ocrResult && imageFile && (
        <OcrPreviewDialog
          open={!!ocrResult}
          onOpenChange={(open) => { if (!open) setOcrResult(null) }}
          result={ocrResult}
          imageBlob={imageFile}
          categories={categories}
          onSave={handleSaveInvoice}
        />
      )}
    </>
  )
}
