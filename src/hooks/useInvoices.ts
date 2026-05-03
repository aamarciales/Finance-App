import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { toast } from 'sonner'
import { db } from '@/db/schema'
import { getEquivalentAmounts } from '@/lib/currency'
import type { Invoice, InvoiceItem, Attachment, Category } from '@/types/domain'

export interface EnrichedInvoice extends Invoice {
  items: InvoiceItem[]
  attachment?: Attachment
  transactionConcept?: string
  transactionCategoryId?: number
}

export interface InvoiceFormData {
  merchant: string
  branch?: string
  date: string
  currency: 'COP' | 'USD' | 'EUR'
  items: Array<{
    name: string
    quantity: number
    unitPrice: number
    subCategory?: string
  }>
  file?: File
  removeAttachment?: boolean
  categoryId: number
}

export function useInvoices() {
  const invoices = useLiveQuery(() => db.invoices.orderBy('date').reverse().toArray())
  const categories = useLiveQuery(() => db.categories.toArray()) ?? []

  const categoryMap = useMemo(() => {
    const m = new Map<number, Category>()
    for (const c of categories) {
      if (c.id != null) m.set(c.id, c)
    }
    return m
  }, [categories])

  async function addInvoice(data: InvoiceFormData) {
    const total = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

    // Get TRM for the date
    const trmRecord = await db.trmRecords.get(data.date)
    const trm = trmRecord?.rate ?? 4087.30
    const rates = { trm, eurToUsd: 1.08 }
    const { amountInBase, amountInSecondary } = getEquivalentAmounts(total, data.currency, rates)
    const now = new Date().toISOString()

    await db.transaction('rw', [db.invoices, db.invoiceItems, db.attachments, db.transactions], async () => {
      // Create invoice
      const invoiceId = await db.invoices.add({
        transactionId: 0,
        merchant: data.merchant,
        branch: data.branch,
        date: data.date,
        total,
        currency: data.currency,
        trm,
        itemCount: data.items.length,
        createdAt: now,
      })

      // Create items
      for (const item of data.items) {
        await db.invoiceItems.add({
          invoiceId,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice,
          subCategory: item.subCategory,
        })
      }

      // Create transaction
      const txId = await db.transactions.add({
        date: data.date,
        type: 'expense',
        concept: `${data.merchant}${data.branch ? ` · ${data.branch}` : ''}`,
        categoryId: data.categoryId,
        amount: total,
        currency: data.currency,
        trm,
        amountInBase,
        amountInSecondary,
        invoiceId,
        createdAt: now,
        updatedAt: now,
      })

      // Link invoice to transaction
      await db.invoices.update(invoiceId, { transactionId: txId })

      // Save attachment if provided
      if (data.file) {
        const arrayBuffer = await data.file.arrayBuffer()
        const blob = new Blob([arrayBuffer], { type: data.file.type })
        await db.attachments.add({
          invoiceId,
          filename: data.file.name,
          mimeType: data.file.type,
          size: data.file.size,
          type: data.file.type.startsWith('image/') ? 'image' : 'pdf',
          blob,
          createdAt: now,
        })
      }
    })

    toast.success('Factura creada')
  }

  async function updateInvoice(id: number, data: InvoiceFormData, existing: EnrichedInvoice) {
    const total = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    const trmRecord = await db.trmRecords.get(data.date)
    const trm = trmRecord?.rate ?? existing.trm ?? 4087.30
    const rates = { trm, eurToUsd: 1.08 }
    const { amountInBase, amountInSecondary } = getEquivalentAmounts(total, data.currency, rates)
    const now = new Date().toISOString()

    await db.transaction('rw', [db.invoices, db.invoiceItems, db.attachments, db.transactions], async () => {
      await db.invoices.update(id, {
        merchant: data.merchant,
        branch: data.branch,
        date: data.date,
        total,
        currency: data.currency,
        trm,
        itemCount: data.items.length,
      })

      // Replace items
      await db.invoiceItems.where('invoiceId').equals(id).delete()
      for (const item of data.items) {
        await db.invoiceItems.add({
          invoiceId: id,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice,
          subCategory: item.subCategory,
        })
      }

      // Update linked transaction
      if (existing.transactionId) {
        await db.transactions.update(existing.transactionId, {
          date: data.date,
          concept: `${data.merchant}${data.branch ? ` · ${data.branch}` : ''}`,
          categoryId: data.categoryId,
          amount: total,
          currency: data.currency,
          trm,
          amountInBase,
          amountInSecondary,
          updatedAt: now,
        })
      }

      // Handle attachment changes
      if (data.file) {
        // New file: delete old, save new
        await db.attachments.where('invoiceId').equals(id).delete()
        const arrayBuffer = await data.file.arrayBuffer()
        const blob = new Blob([arrayBuffer], { type: data.file.type })
        await db.attachments.add({
          invoiceId: id,
          filename: data.file.name,
          mimeType: data.file.type,
          size: data.file.size,
          type: data.file.type.startsWith('image/') ? 'image' : 'pdf',
          blob,
          createdAt: now,
        })
      } else if (data.removeAttachment) {
        await db.attachments.where('invoiceId').equals(id).delete()
      }
    })

    toast.success('Factura actualizada')
  }

  async function deleteInvoice(id: number) {
    const inv = await db.invoices.get(id)
    if (!inv) return

    await db.transaction('rw', [db.invoices, db.invoiceItems, db.attachments, db.transactions], async () => {
      await db.invoiceItems.where('invoiceId').equals(id).delete()
      await db.attachments.where('invoiceId').equals(id).delete()
      if (inv.transactionId) {
        await db.transactions.delete(inv.transactionId)
      }
      await db.invoices.delete(id)
    })

    toast.success('Factura eliminada')
  }

  return {
    invoices: invoices ?? [],
    categories,
    categoryMap,
    loading: invoices === undefined,
    addInvoice,
    updateInvoice,
    deleteInvoice,
  }
}
