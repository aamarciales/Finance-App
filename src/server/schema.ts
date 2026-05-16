import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core'

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  color: text('color').notNull(),
  icon: text('icon').notNull(),
  type: text('type', { enum: ['income', 'expense'] }).notNull(),
  isSystem: integer('is_system', { mode: 'boolean' }).default(false),
})

export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull(),
  date: text('date').notNull(),
  type: text('type', { enum: ['income', 'expense', 'debt_payment', 'transfer'] }).notNull(),
  concept: text('concept').notNull(),
  categoryId: integer('category_id').notNull(),
  amount: real('amount').notNull(),
  currency: text('currency', { enum: ['COP', 'USD', 'EUR'] }).notNull(),
  trm: real('trm').notNull(),
  amountInBase: real('amount_in_base').notNull(),
  amountInSecondary: real('amount_in_secondary').notNull(),
  invoiceId: integer('invoice_id'),
  debtId: integer('debt_id'),
  isTitheCalculated: integer('is_tithe_calculated', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const invoices = sqliteTable('invoices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull(),
  transactionId: integer('transaction_id').notNull(),
  date: text('date').notNull(),
  merchant: text('merchant').notNull(),
  total: real('total').notNull(),
  currency: text('currency', { enum: ['COP', 'USD', 'EUR'] }).notNull(),
  trm: real('trm').notNull(),
  itemCount: integer('item_count').notNull(),
  invoiceNumber: text('invoice_number'),
  paymentMethod: text('payment_method'),
  location: text('location'),
  notes: text('notes'),
  attachmentUrl: text('attachment_url'),
  createdAt: text('created_at').notNull(),
})

export const invoiceItems = sqliteTable('invoice_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoiceId: integer('invoice_id').notNull(),
  name: text('name').notNull(),
  quantity: real('quantity').notNull(),
  unitPrice: real('unit_price').notNull(),
  totalPrice: real('total_price').notNull(),
  subCategory: text('sub_category'),
  barcode: text('barcode'),
})

export const debts = sqliteTable('debts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  creditor: text('creditor').notNull(),
  type: text('type', { enum: ['credit_card', 'personal_loan', 'family_loan'] }).notNull(),
  originalAmount: real('original_amount').notNull(),
  currentBalance: real('current_balance').notNull(),
  currency: text('currency', { enum: ['COP', 'USD', 'EUR'] }).notNull(),
  interestRate: real('interest_rate'),
  monthlyPayment: real('monthly_payment'),
  totalInstallments: integer('total_installments'),
  paidInstallments: integer('paid_installments'),
  nextPaymentDate: text('next_payment_date'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
})

export const tithePayments = sqliteTable('tithe_payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull(),
  date: text('date').notNull(),
  amountUsd: real('amount_usd').notNull(),
  amountCop: real('amount_cop'),
  currency: text('currency', { enum: ['COP', 'USD', 'EUR'] }).default('USD'),
  paidTo: text('paid_to').notNull(),
  type: text('type', { enum: ['tithe', 'offering', 'both'] }).notNull(),
  notes: text('notes'),
  attachmentUrl: text('attachment_url'),
  transactionId: integer('transaction_id'),
  createdAt: text('created_at').notNull(),
})

export const titheCommitments = sqliteTable('tithe_commitments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull(),
  incomeTransactionId: integer('income_transaction_id').notNull(),
  date: text('date').notNull(),
  incomeAmount: real('income_amount').notNull(),
  incomeCurrency: text('income_currency', { enum: ['COP', 'USD', 'EUR'] }).notNull(),
  incomeTrm: real('income_trm').notNull(),
  incomeAmountBase: real('income_amount_base').notNull(),
  tithePercent: real('tithe_percent').notNull(),
  offeringPercent: real('offering_percent').notNull(),
  titheAmount: real('tithe_amount').notNull(),
  offeringAmount: real('offering_amount').notNull(),
  totalAmount: real('total_amount').notNull(),
  status: text('status', { enum: ['pending', 'paid'] }).notNull().default('pending'),
  tithePaymentId: integer('tithe_payment_id'),
  createdAt: text('created_at').notNull(),
})

export const settings = sqliteTable('settings', {
  key: text('key').notNull(),
  userId: text('user_id').notNull(),
  value: text('value', { mode: 'json' }),
})

export const goals = sqliteTable('goals', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  targetAmount: real('target_amount').notNull(),
  currentAmount: real('current_amount').default(0).notNull(),
  deadline: text('deadline'),
  currency: text('currency', { enum: ['COP', 'USD', 'EUR'] }).notNull(),
  color: text('color').notNull(),
  icon: text('icon').notNull(),
  createdAt: text('created_at').notNull(),
})
