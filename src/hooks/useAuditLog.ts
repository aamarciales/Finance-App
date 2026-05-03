import type { AuditEntityType, AuditLogEntry, AuditOperation } from '@/types/domain'

export interface AuditLogFilters {
  entityType?: AuditEntityType
  period?: 'today' | 'week' | 'month' | 'all'
  operation?: AuditOperation
}

export async function logChange(_params: {
  entityType: AuditEntityType
  entityId: number
  operation: AuditOperation
  beforeState?: object
  afterState?: object
  description: string
}): Promise<void> {
  // Deprecated on Cloud Migration
}

export function useAuditLogEntries(_filters: AuditLogFilters = {}): AuditLogEntry[] {
  return []
}

export async function revertEntry(_entry: AuditLogEntry): Promise<void> {
  throw new Error('Revert functionality is currently disabled in the cloud version.')
}
