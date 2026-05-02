import Dexie, { type Table } from 'dexie'
import type {
  Attachment,
  Category,
  Debt,
  ExchangeOperation,
  Goal,
  Invoice,
  InvoiceItem,
  Setting,
  TithePayment,
  TRMRecord,
  Transaction,
} from '@/types/domain'

export class PatrimonioDB extends Dexie {
  transactions!: Table<Transaction, number>
  invoices!: Table<Invoice, number>
  invoiceItems!: Table<InvoiceItem, number>
  categories!: Table<Category, number>
  attachments!: Table<Attachment, number>
  goals!: Table<Goal, number>
  debts!: Table<Debt, number>
  tithePayments!: Table<TithePayment, number>
  trmRecords!: Table<TRMRecord, string>
  exchangeOps!: Table<ExchangeOperation, number>
  settings!: Table<Setting, string>

  constructor() {
    super('PatrimonioDB')
    this.version(1).stores({
      transactions:
        '++id, date, type, categoryId, currency, invoiceId, [date+type]',
      invoices: '++id, transactionId, date, merchant',
      invoiceItems: '++id, invoiceId, subCategory',
      categories: '++id, name, type, parentId',
      attachments: '++id, transactionId, invoiceId, type',
      goals: '++id, targetDate',
      debts: '++id, type, nextPaymentDate',
      tithePayments: '++id, date, txId',
      trmRecords: 'date',
      exchangeOps: '++id, date',
      settings: 'key',
    })
  }
}

export const db = new PatrimonioDB()
