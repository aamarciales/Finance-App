import { useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useApi } from '@/lib/api'
import { getEquivalentAmounts } from '@/lib/currency'
import type { Invoice, InvoiceItem, Category, Transaction } from '@/types/domain'

export interface EnrichedInvoice extends Invoice {
  items: InvoiceItem[]
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
  categoryId: number
  subtotal?: number
  discount?: number
  total?: number
  attachmentUrl?: string
  accountId?: string | null
}

export function useInvoices(rates: { trm: number; eurToUsd: number }) {
  const api = useApi()
  const queryClient = useQueryClient()

  const { data: rawInvoices, isLoading: loadingInv } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => api.get<Invoice[]>('/invoices'),
  })

  const { data: rawItems, isLoading: loadingItems } = useQuery({
    queryKey: ['invoiceItems'],
    queryFn: () => api.get<InvoiceItem[]>('/invoice-items'),
  })

  const { data: categories, isLoading: loadingCats } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/categories'),
  })

  const { data: transactions } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => api.get<Transaction[]>('/transactions'),
  })

  const categoryMap = useMemo(() => {
    const m = new Map<number, Category>()
    if (categories) {
      for (const c of categories) {
        if (c.id != null) m.set(c.id, c)
      }
    }
    return m
  }, [categories])

  const enrichedInvoices: EnrichedInvoice[] = useMemo(() => {
    if (!rawInvoices || !rawItems) return []
    
    return rawInvoices.map((inv) => {
      const items = rawItems.filter(i => i.invoiceId === inv.id)
      const tx = transactions?.find(t => t.id === inv.transactionId)
      
      return {
        ...inv,
        items,
        transactionConcept: tx?.concept,
        transactionCategoryId: tx?.categoryId,
      }
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [rawInvoices, rawItems, transactions])

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['invoices'] })
    queryClient.invalidateQueries({ queryKey: ['invoiceItems'] })
    queryClient.invalidateQueries({ queryKey: ['transactions'] })
  }

  const addInvoice = async (data: InvoiceFormData) => {
    const itemsTotal = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    const discount = data.discount ?? 0
    const total = data.total ?? Math.max(0, itemsTotal - discount)
    const subtotal = data.subtotal ?? itemsTotal
    const { trm } = rates
    const { amountInBase, amountInSecondary } = getEquivalentAmounts(total, data.currency, rates)

    // 1. Create invoice
    const inv = await api.post<Invoice>('/invoices', {
      transactionId: 0,
      merchant: data.merchant,
      branch: data.branch,
      date: data.date,
      subtotal,
      discount: discount || undefined,
      total,
      currency: data.currency,
      trm,
      itemCount: data.items.length,
      attachmentUrl: data.attachmentUrl,
    })

    // 2. Create items
    for (const item of data.items) {
      await api.post('/invoice-items', {
        invoiceId: inv.id,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.quantity * item.unitPrice,
        subCategory: item.subCategory,
      })
    }

    // 3. Create transaction
    const tx = await api.post<Transaction>('/transactions', {
      date: data.date,
      type: 'expense',
      concept: `${data.merchant}${data.branch ? ` · ${data.branch}` : ''}`,
      categoryId: data.categoryId,
      amount: total,
      currency: data.currency,
      trm,
      amountInBase,
      amountInSecondary,
      invoiceId: inv.id,
      accountId: data.accountId ?? null,
    })

    // 4. Link invoice to transaction
    await api.put(`/invoices/${inv.id}`, { transactionId: tx.id })

    invalidateAll()
    toast.success('Factura creada')
  }

  const updateInvoice = async (id: number, data: InvoiceFormData, existing: EnrichedInvoice) => {
    const total = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    const trm = existing.trm || rates.trm
    const { amountInBase, amountInSecondary } = getEquivalentAmounts(total, data.currency, { ...rates, trm })

    // Update invoice
    await api.put(`/invoices/${id}`, {
      merchant: data.merchant,
      branch: data.branch,
      date: data.date,
      total,
      currency: data.currency,
      trm,
      itemCount: data.items.length,
      attachmentUrl: data.attachmentUrl,
    })

    // Replace items (delete old, create new)
    for (const item of existing.items) {
      if (item.id) await api.delete(`/invoice-items/${item.id}`)
    }
    
    for (const item of data.items) {
      await api.post('/invoice-items', {
        invoiceId: id,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.quantity * item.unitPrice,
        subCategory: item.subCategory,
      })
    }

    // Update transaction
    if (existing.transactionId) {
      await api.put(`/transactions/${existing.transactionId}`, {
        date: data.date,
        concept: `${data.merchant}${data.branch ? ` · ${data.branch}` : ''}`,
        categoryId: data.categoryId,
        amount: total,
        currency: data.currency,
        trm,
        amountInBase,
        amountInSecondary,
        accountId: data.accountId ?? null,
      })
    }

    invalidateAll()
    toast.success('Factura actualizada')
  }

  const deleteInvoice = async (id: number) => {
    const inv = rawInvoices?.find(i => i.id === id)
    if (!inv) return

    const items = rawItems?.filter(i => i.invoiceId === id) ?? []
    
    // Delete items
    for (const item of items) {
      if (item.id) await api.delete(`/invoice-items/${item.id}`)
    }

    // Delete transaction
    if (inv.transactionId) {
      await api.delete(`/transactions/${inv.transactionId}`)
    }

    // Delete invoice
    await api.delete(`/invoices/${id}`)

    invalidateAll()
    toast.success('Factura eliminada')
  }

  return {
    invoices: enrichedInvoices,
    categories: categories ?? [],
    categoryMap,
    loading: loadingInv || loadingItems || loadingCats,
    addInvoice,
    updateInvoice,
    deleteInvoice,
  }
}
