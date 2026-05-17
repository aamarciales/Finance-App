import type { Currency } from '@/types/domain'

/** Convierte un monto entre monedas usando tasas proporcionadas. */
export function convertAmount(
  amount: number,
  from: Currency,
  to: Currency,
  rates: { trm: number; eurToUsd: number },
): number {
  if (from === to) return amount

  // First convert to USD, then to target
  const inUsd =
    from === 'USD' ? amount
    : from === 'COP' ? amount / rates.trm
    : amount * rates.eurToUsd // EUR

  return to === 'USD' ? inUsd
    : to === 'COP' ? Math.round(inUsd * rates.trm)
    : Math.round((inUsd / rates.eurToUsd) * 100) / 100 // EUR
}

/**
 * Dado un monto y su moneda, calcula los equivalentes en base (USD)
 * y secundaria (COP) según las tasas del día.
 */
export function getEquivalentAmounts(
  amount: number,
  currency: Currency,
  rates: { trm: number; eurToUsd: number },
): { amountInBase: number; amountInSecondary: number } {
  // amountInBase = USD equivalent
  const amountInBase =
    currency === 'USD' ? amount
    : currency === 'COP' ? Math.round((amount / rates.trm) * 100) / 100
    : Math.round(amount * rates.eurToUsd * 100) / 100 // EUR

  // amountInSecondary = COP equivalent
  const amountInSecondary =
    currency === 'COP' ? amount
    : Math.round(amountInBase * rates.trm)

  return { amountInBase, amountInSecondary }
}

interface AccountLike { currency: string }

/**
 * When the user provides an actualAmount (real debit in account currency),
 * compute effective TRM and adjusted amounts. Falls back to official rates otherwise.
 */
export function computeAmountsWithActual(
  amount: number,
  currency: Currency,
  account: AccountLike | undefined,
  actualAmount: number | null | undefined,
  rates: { trm: number; eurToUsd: number },
): { amountInBase: number; amountInSecondary: number; trm: number } {
  // No cross-currency scenario — use official rates
  if (!account || !actualAmount || account.currency === currency) {
    const eq = getEquivalentAmounts(amount, currency, rates)
    return { ...eq, trm: rates.trm }
  }

  // USD tx → COP account: user provides the actual COP debited
  if (currency === 'USD' && account.currency === 'COP') {
    return {
      amountInBase: amount,
      amountInSecondary: actualAmount,
      trm: actualAmount / amount,
    }
  }

  // COP tx → USD account: user provides the actual USD debited
  if (currency === 'COP' && account.currency === 'USD') {
    return {
      amountInBase: actualAmount,
      amountInSecondary: amount,
      trm: amount / actualAmount,
    }
  }

  // Other combos (EUR, etc.) — fall back to official
  const eq = getEquivalentAmounts(amount, currency, rates)
  return { ...eq, trm: rates.trm }
}
