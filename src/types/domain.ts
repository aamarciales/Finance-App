export type Currency = 'USD' | 'COP' | 'EUR'

export type TxType =
  | 'expense'
  | 'income'
  | 'debt_payment'
  | 'transfer'

export interface Transaction {
  id?: number
  date: string
  type: TxType
  concept: string
  categoryId: number
  amount: number
  currency: Currency
  trm: number
  amountInBase: number
  amountInSecondary: number
  notes?: string
  invoiceId?: number
  attachmentIds?: number[]
  isRecurring?: boolean
  recurringId?: number
  debtId?: number
  capitalAmount?: number
  interestAmount?: number
  transferGroupId?: string
  createdAt: string
  updatedAt: string
}

export interface Invoice {
  id?: number
  transactionId: number
  merchant: string
  branch?: string
  date: string
  total: number
  currency: Currency
  trm: number
  itemCount: number
  ocrConfidence?: number
  rawOcrData?: object
  createdAt: string
}

export interface InvoiceItem {
  id?: number
  invoiceId: number
  name: string
  quantity: number
  unitPrice?: number
  totalPrice: number
  subCategory?: string
  notes?: string
}

export type CategoryType = 'expense' | 'income'

export interface Category {
  id?: number
  name: string
  parentId?: number
  color: string
  icon: string
  type: CategoryType
  isSystem: boolean
}

export interface Attachment {
  id?: number
  type: 'image' | 'pdf' | 'csv'
  filename: string
  mimeType: string
  size: number
  blob: Blob
  thumbnail?: Blob
  transactionId?: number
  invoiceId?: number
  createdAt: string
}

export interface Goal {
  id?: number
  name: string
  description?: string
  iconKey: string
  color: string
  targetAmount: number
  currentAmount: number
  currency: Currency
  monthlyContribution?: number
  targetDate?: string
  createdAt: string
}

export type DebtType =
  | 'credit_card'
  | 'personal_loan'
  | 'family_loan'
  | 'mortgage'
  | 'other'

export interface Debt {
  id?: number
  name: string
  creditor: string
  type: DebtType
  originalAmount: number
  currentBalance: number
  currency: Currency
  interestRate: number
  monthlyPayment: number
  totalInstallments: number
  paidInstallments: number
  nextPaymentDate: string
  isPaid?: boolean
  notes?: string
  createdAt: string
}

export interface TithePayment {
  id?: number
  date: string
  destination: string
  tithesAmount: number
  offeringsAmount: number
  currency: Currency
  trm: number
  notes?: string
  txId: number
}

export interface TRMRecord {
  date: string
  rate: number
  source: 'banrep' | 'manual' | 'wise'
  fetchedAt: string
}

export interface ForexRate {
  id?: number
  pair: string        // e.g. 'EUR-USD'
  date: string        // ISO date
  rate: number
  source: 'frankfurter' | 'manual' | 'wise'
  fetchedAt: string
}

export type AuditEntityType = 'transaction' | 'category' | 'debt' | 'goal' | 'tithe_payment'
export type AuditOperation = 'create' | 'update' | 'delete' | 'revert'

export interface AuditLogEntry {
  id?: number
  timestamp: string
  entityType: AuditEntityType
  entityId: number
  operation: AuditOperation
  beforeState?: object
  afterState?: object
  description: string
  isReverted: boolean
}

export interface ExchangeOperation {
  id?: number
  date: string
  fromCurrency: Currency
  toCurrency: Currency
  fromAmount: number
  toAmount: number
  effectiveRate: number
  platform?: string
  fees?: number
  notes?: string
}

export interface Setting<V = unknown> {
  key: string
  value: V
}

export interface TitheCategoryConfig {
  tithe: number
  offering: number
}

export interface TitheConfig {
  tithePercentByIncomeCategory: Record<number, TitheCategoryConfig>
  defaultTithe: number
  defaultOffering: number
  destination: string
}

export interface TaxProfile {
  residentStatus: 'resident' | 'non_resident'
  regime: 'simple' | 'ordinario' | 'none'
  activityCode: string
  isVATResponsible: boolean
  validatedByAccountant: boolean
}

export type OcrProvider = 'claude' | 'tesseract' | 'off'

export interface AppSettings {
  baseCurrency: Currency
  secondaryCurrency: Currency
  displayName: string
  titheConfig: TitheConfig
  taxProfile: TaxProfile
  ocrProvider: OcrProvider
  autoCategorize: boolean
  monthlyTaxProvisionRate: number
  availableCapitalAmount?: number
  availableCapitalCurrency?: Currency
  titheCarryoverUsd?: number
  titheStartDate?: string
}
