/** Income transactions with any of these values skip auto tithe commitment generation. */
export type TitheExemption = 'exempt' | 'already_tithed' | 'loan_proceeds'

/** Radix Select forbids empty string values — map to null in the form/API. */
export const TITHE_EXEMPTION_AUTO = 'auto' as const

export const TITHE_EXEMPTION_OPTIONS = [
  { value: TITHE_EXEMPTION_AUTO, label: 'Calculate tithe automatically' },
  { value: 'exempt' as const, label: 'Exento de diezmo' },
  { value: 'already_tithed' as const, label: 'Ya diezmado' },
  { value: 'loan_proceeds' as const, label: 'Loan (no tithe)' },
]

export function shouldGenerateTitheCommitment(
  exemption: TitheExemption | null | undefined,
): boolean {
  return !exemption
}

export function parseTitheExemption(
  value: unknown,
): TitheExemption | null {
  if (value === 'exempt' || value === 'already_tithed' || value === 'loan_proceeds') {
    return value
  }
  return null
}
