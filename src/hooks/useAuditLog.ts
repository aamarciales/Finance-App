import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/schema'
import type { AuditEntityType, AuditLogEntry, AuditOperation } from '@/types/domain'

const MAX_ENTRIES = 1000

export interface AuditLogFilters {
  entityType?: AuditEntityType
  period?: 'today' | 'week' | 'month' | 'all'
  operation?: AuditOperation
}

function periodStart(period: AuditLogFilters['period']): string | undefined {
  if (!period || period === 'all') return undefined
  const now = new Date()
  if (period === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  if (period === 'week') {
    const d = new Date(now)
    d.setDate(d.getDate() - 7)
    return d.toISOString()
  }
  if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  }
  return undefined
}

export async function logChange(params: {
  entityType: AuditEntityType
  entityId: number
  operation: AuditOperation
  beforeState?: object
  afterState?: object
  description: string
}): Promise<void> {
  const entry: Omit<AuditLogEntry, 'id'> = {
    timestamp: new Date().toISOString(),
    entityType: params.entityType,
    entityId: params.entityId,
    operation: params.operation,
    beforeState: params.beforeState,
    afterState: params.afterState,
    description: params.description,
    isReverted: false,
  }
  await db.auditLog.add(entry)
  await pruneOld()
}

async function pruneOld() {
  const count = await db.auditLog.count()
  if (count > MAX_ENTRIES) {
    const oldest = await db.auditLog.orderBy('id').limit(count - MAX_ENTRIES).toArray()
    await db.auditLog.bulkDelete(oldest.map((e) => e.id!))
  }
}

export function useAuditLogEntries(filters: AuditLogFilters = {}) {
  return useLiveQuery(async () => {
    const all = await db.auditLog.orderBy('timestamp').reverse().toArray()
    const start = periodStart(filters.period)
    return all.filter((e) => {
      if (filters.entityType && e.entityType !== filters.entityType) return false
      if (filters.operation && e.operation !== filters.operation) return false
      if (start && e.timestamp < start) return false
      return true
    })
  }, [filters.entityType, filters.operation, filters.period])
}

export async function revertEntry(entry: AuditLogEntry): Promise<void> {
  if (entry.isReverted) throw new Error('Entry already reverted')

  const allForEntity = await db.auditLog
    .filter((e) => e.entityType === entry.entityType && e.entityId === entry.entityId && !e.isReverted)
    .toArray()
  const latest = allForEntity.sort((a, b) => a.timestamp.localeCompare(b.timestamp)).pop()
  if (latest?.id !== entry.id) throw new Error('Solo el último cambio puede revertirse')

  await db.transaction('rw', [db.auditLog, db.transactions, db.categories, db.debts, db.goals, db.tithePayments], async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const table = getTable(entry.entityType) as any

    if (entry.operation === 'update' && entry.beforeState) {
      await table.update(entry.entityId, { ...entry.beforeState })
    } else if (entry.operation === 'delete' && entry.beforeState) {
      await table.add({ ...entry.beforeState })
    } else if (entry.operation === 'create') {
      await table.delete(entry.entityId)
    }

    await db.auditLog.update(entry.id!, { isReverted: true })

    await logChange({
      entityType: entry.entityType,
      entityId: entry.entityId,
      operation: 'revert',
      beforeState: entry.afterState,
      afterState: entry.beforeState,
      description: `Revertido: ${entry.description}`,
    })
  })
}

function getTable(entityType: AuditEntityType) {
  switch (entityType) {
    case 'transaction': return db.transactions
    case 'category': return db.categories
    case 'debt': return db.debts
    case 'goal': return db.goals
    case 'tithe_payment': return db.tithePayments
    default: return undefined
  }
}
