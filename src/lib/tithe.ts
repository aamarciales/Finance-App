import type { AppSettings } from '@/types/domain'

const warnedCategoryIds = new Set<number>()

interface TitheResult {
  tithe: number
  offering: number
}

export function calculateTitheForIncome(
  amount: number,
  categoryId: number | undefined,
  settings: AppSettings | undefined,
): TitheResult {
  if (!amount || amount <= 0) {
    return { tithe: 0, offering: 0 }
  }

  const titheConfig = settings?.titheConfig
  const defaultTithe = titheConfig?.defaultTithe ?? 10
  const defaultOffering = titheConfig?.defaultOffering ?? 0

  if (!categoryId || categoryId <= 0) {
    return {
      tithe: Math.round(amount * defaultTithe / 100 * 100) / 100,
      offering: Math.round(amount * defaultOffering / 100 * 100) / 100,
    }
  }

  const categoryConfig = titheConfig?.tithePercentByIncomeCategory?.[categoryId]

  if (
    !categoryConfig &&
    titheConfig?.tithePercentByIncomeCategory &&
    Object.keys(titheConfig.tithePercentByIncomeCategory).length > 0 &&
    import.meta.env.DEV
  ) {
    if (!warnedCategoryIds.has(categoryId)) {
      console.warn(
        `[tithe] No tithe config found for categoryId=${categoryId}. ` +
        `Using defaults (tithe=${defaultTithe}%, offering=${defaultOffering}%). ` +
        `This may indicate orphan IDs in settings after a category reseed. ` +
        `Configured IDs: ${Object.keys(titheConfig.tithePercentByIncomeCategory).join(', ')}`,
      )
      warnedCategoryIds.add(categoryId)
    }
  }

  const tithePct = categoryConfig?.tithe ?? defaultTithe
  const offeringPct = categoryConfig?.offering ?? defaultOffering

  return {
    tithe: Math.round(amount * (tithePct / 100) * 100) / 100,
    offering: Math.round(amount * (offeringPct / 100) * 100) / 100,
  }
}
