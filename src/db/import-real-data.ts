import { db } from './schema'
import { getEquivalentAmounts } from '@/lib/currency'
import type { TxType } from '@/types/domain'
import Papa from 'papaparse'
import csvText from '@/data/finanzas-abril-mayo-2026.csv?raw'

const EUR_RATE = 1.08

export async function importRealData(): Promise<void> {
  console.log('[import] Starting CSV data import...')

  // Debts: [0]=Tío Bairon, [1]=Motorola, [2]=Nu Bank
  const debtIds = await createDebts()
  console.log(`[import] Created ${debtIds.length} debts`)

  // Get categories to map by name
  const categories = await db.categories.toArray()
  const getCategoryId = (name: string): number => {
    let cat = categories.find(c => c.name.toLowerCase() === name.toLowerCase())
    if (cat && cat.id) return cat.id
    // fallbacks
    if (name.toLowerCase() === 'religiosa') cat = categories.find(c => c.name === 'Iglesia')
    if (name.toLowerCase() === 'telefonia') cat = categories.find(c => c.name === 'Teléfono')
    if (name.toLowerCase() === 'tarjeta credito') cat = categories.find(c => c.name === 'Deuda')
    if (name.toLowerCase() === 'limpieza') cat = categories.find(c => c.name === 'Hogar')
    if (name.toLowerCase() === 'higiene personal') cat = categories.find(c => c.name === 'Salud')
    if (cat && cat.id) return cat.id
    
    // fallback to "Otros"
    const otros = categories.find(c => c.name === 'Otros')
    return otros?.id ?? 12
  }

  // Parse CSV
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    delimiter: ';',
    skipEmptyLines: true,
  })

  let txCount = 0
  let isSummary = false

  const invoiceGroups = new Map<string, any>()
  const standaloneTxs: any[] = []

  for (const row of result.data) {
    if (Object.values(row).some(v => v && v.includes('RESUMEN'))) {
      isSummary = true
      continue
    }
    if (isSummary) continue

    const rawDate = (row['Fecha'] || '').trim()
    // only parse rows that have a proper date (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      continue
    }

    const typeStr = (row['Tipo'] || '').trim().toLowerCase()
    let categoryName = (row['Categoria'] || '').trim()
    const subCategory = (row['Subcategoria'] || '').trim()
    
    // Si la subcategoría es diezmo u ofrenda, usarla como categoría principal
    if (subCategory.toLowerCase() === 'diezmo' || subCategory.toLowerCase() === 'diezmos') {
      categoryName = 'Diezmo'
    } else if (subCategory.toLowerCase() === 'ofrenda' || subCategory.toLowerCase() === 'ofrendas') {
      categoryName = 'Ofrendas'
    }
    
    let txType: TxType = 'expense'
    if (typeStr === 'ingreso') txType = 'income'
    if (typeStr === 'deuda' || typeStr.includes('tarjeta credito')) txType = 'debt_payment'
    if (categoryName.toLowerCase() === 'transferencia' || typeStr.includes('nequi')) txType = 'transfer'

    const concept = (row['Concepto'] || '').trim() || (row['Descripcion'] || '').trim()
    const amount = parseFloat((row['Monto_Original'] || '').replace(/,/g, '')) || 0
    if (amount === 0 && !concept) continue // Skip empty amounts

    const currencyStr = (row['Moneda'] || 'COP').trim().toUpperCase()
    const currency = (currencyStr === 'USD' || currencyStr === 'EUR') ? currencyStr : 'COP'
    
    let trm = parseFloat((row['Tasa_Cambio_USD_COP'] || '').replace(/,/g, ''))
    if (isNaN(trm) || trm === 0) {
      trm = 3600 // Default fallback si no hay TRM explicita
    }

    let debtId: number | undefined
    if (txType === 'debt_payment') {
      const acreedor = (row['Acreedor'] || row['Proveedor_Pagador'] || row['Concepto'] || '').toLowerCase()
      if (acreedor.includes('bairon')) debtId = debtIds[0]
      else if (acreedor.includes('motorola')) debtId = debtIds[1]
      else if (acreedor.includes('nu') || acreedor.includes('bancolombia') || typeStr.includes('tarjeta credito')) debtId = debtIds[2]
    }

    const rates = { trm, eurToUsd: EUR_RATE }
    const { amountInBase, amountInSecondary } = getEquivalentAmounts(amount, currency, rates)

    const invoiceNum = (row['Numero_Factura'] || '').trim()
    const isPurchase = concept.toLowerCase().includes('compra supermercado')
    const hasInvoiceNumber = invoiceNum !== ''

    if (hasInvoiceNumber || isPurchase) {
      const key = hasInvoiceNumber ? invoiceNum : `auto_${rawDate}_${categoryName}`
      const merchant = (row['Proveedor_Pagador'] || row['Concepto'] || 'Desconocido').split(' - ')[0]

      if (!invoiceGroups.has(key)) {
        invoiceGroups.set(key, {
          date: rawDate,
          merchant,
          categoryName,
          txType,
          currency,
          trm,
          debtId,
          items: [],
          totalAmount: 0,
          totalAmountCop: 0,
          concept: `Compra en ${merchant}`,
        })
      }

      const group = invoiceGroups.get(key)
      // Extract specific item name if it has " - "
      const itemNameParts = concept.split(' - ')
      const itemName = itemNameParts.length > 1 ? itemNameParts[1] : concept
      
      group.items.push({
        name: itemName,
        quantity: 1,
        unitPrice: amount,
        totalPrice: amount,
        subCategory: (row['Subcategoria'] || '').trim() || categoryName,
      })
      group.totalAmount += amount
      group.totalAmountCop += amountInSecondary
    } else {
      standaloneTxs.push({
        date: rawDate,
        type: txType,
        concept,
        categoryName,
        amount,
        currency,
        trm,
        amountInBase,
        amountInSecondary,
        debtId,
      })
    }
  }

  // Insert grouped invoices
  for (const [, group] of invoiceGroups.entries()) {
    const categoryId = getCategoryId(group.categoryName)
    const rates = { trm: group.trm, eurToUsd: EUR_RATE }
    const { amountInBase, amountInSecondary } = getEquivalentAmounts(group.totalAmount, group.currency, rates)

    const txId = await db.transactions.add({
      date: group.date,
      type: group.txType,
      concept: group.concept,
      categoryId,
      amount: group.totalAmount,
      currency: group.currency,
      trm: group.trm,
      amountInBase,
      amountInSecondary,
      debtId: group.debtId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }) as number

    const invoiceId = await db.invoices.add({
      transactionId: txId,
      date: group.date,
      merchant: group.merchant,
      total: group.totalAmount,
      currency: group.currency,
      trm: group.trm,
      itemCount: group.items.length,
      createdAt: new Date().toISOString(),
    }) as number

    await db.transactions.update(txId, { invoiceId })

    for (const item of group.items) {
      await db.invoiceItems.add({
        invoiceId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        subCategory: item.subCategory,
      })
    }

    txCount++
  }

  // Insert standalone transactions
  for (const tx of standaloneTxs) {
    const categoryId = getCategoryId(tx.categoryName)
    await db.transactions.add({
      date: tx.date,
      type: tx.type,
      concept: tx.concept,
      categoryId,
      amount: tx.amount,
      currency: tx.currency,
      trm: tx.trm,
      amountInBase: tx.amountInBase,
      amountInSecondary: tx.amountInSecondary,
      debtId: tx.debtId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    txCount++
  }
  
  console.log(`[import] Created ${txCount} transactions from CSV`)

  // Goals
  await db.goals.bulkAdd([
    {
      name: 'Fondo de emergencia',
      description: '6 meses de gastos básicos',
      iconKey: 'shield',
      color: '#2d4a3e',
      targetAmount: 12000,
      currentAmount: 2800,
      currency: 'USD',
      monthlyContribution: 500,
      targetDate: '2027-06-01',
      createdAt: new Date().toISOString(),
    },
    {
      name: 'MacBook Pro M4',
      description: 'Reemplazo del equipo actual',
      iconKey: 'laptop',
      color: '#7a4a6e',
      targetAmount: 3500,
      currentAmount: 800,
      currency: 'USD',
      monthlyContribution: 300,
      targetDate: '2027-03-01',
      createdAt: new Date().toISOString(),
    },
  ])

  // TRM + Forex cache
  const today = new Date().toISOString().slice(0, 10)
  await db.trmRecords.put({
    date: today,
    rate: 3625.49,
    source: 'manual',
    fetchedAt: new Date().toISOString(),
  })
  await db.forexRates.put({
    pair: 'EUR-USD',
    date: today,
    rate: EUR_RATE,
    source: 'manual',
    fetchedAt: new Date().toISOString(),
  })

  console.log(`[import] Done. ${txCount} transactions, ${debtIds.length} debts, 2 goals`)
}

async function createDebts(): Promise<number[]> {
  const ids: number[] = []
  const debts = [
    {
      name: 'Préstamo Tío Bairon',
      creditor: 'Tío Bairon',
      type: 'family_loan' as const,
      originalAmount: 700,
      currentBalance: 475,
      currency: 'USD' as const,
      interestRate: 0,
      monthlyPayment: 100,
      totalInstallments: 7,
      paidInstallments: 2,
      nextPaymentDate: '2026-06-01',
      notes: 'Préstamo sin intereses. Original 700 USD, pagado 225 USD.',
      createdAt: new Date().toISOString(),
    },
    {
      name: 'Teléfono Motorola Edge Fusion',
      creditor: 'Banco Gana',
      type: 'personal_loan' as const,
      originalAmount: 800000,
      currentBalance: 421586.35,
      currency: 'COP' as const,
      interestRate: 18.5,
      monthlyPayment: 131000,
      totalInstallments: 7,
      paidInstallments: 3,
      nextPaymentDate: '2026-05-12',
      notes: 'Cuota mensual con intereses',
      createdAt: new Date().toISOString(),
    },
    {
      name: 'Tarjeta Nu Bank',
      creditor: 'Nu Bank',
      type: 'credit_card' as const,
      originalAmount: 1500000,
      currentBalance: 1011537.62,
      currency: 'COP' as const,
      interestRate: 24.8,
      monthlyPayment: 732293.16,
      totalInstallments: 3,
      paidInstallments: 1,
      nextPaymentDate: '2026-05-19',
      notes: 'Pago mínimo mensual',
      createdAt: new Date().toISOString(),
    },
  ]

  for (const debt of debts) {
    ids.push((await db.debts.add(debt)) as number)
  }
  return ids
}

