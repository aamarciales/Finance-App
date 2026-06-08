import {
  Activity,
  CreditCard,
  FileText,
  LineChart,
  type LucideIcon,
  Receipt,
  ScrollText,
  Search,
  Settings,
  Shield,
  Target,
} from 'lucide-react'

export const TRAKLL_URL =
  import.meta.env.VITE_TRAKLL_URL ?? 'https://timeflow.aamarciales.workers.dev'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Match exacto (para "/") en lugar de prefijo. */
  end?: boolean
}

export interface NavSection {
  label: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { to: '/', label: 'Dashboard', icon: Activity, end: true },
      { to: '/transactions', label: 'Transactions', icon: Receipt },
      { to: '/invoices', label: 'Invoices', icon: ScrollText },
    ],
  },
  {
    label: 'Insights',
    items: [
      { to: '/categories', label: 'Categories', icon: LineChart },
      { to: '/insights', label: 'Insights', icon: Search },
      { to: '/reports', label: 'Reports', icon: FileText },
    ],
  },
  {
    label: 'Commitments',
    items: [
      { to: '/tithe', label: 'Tithe & offerings', icon: Shield },
      { to: '/goals', label: 'Savings goals', icon: Target },
      { to: '/debts', label: 'Debts', icon: CreditCard },
      { to: '/taxes', label: 'Taxes', icon: FileText },
    ],
  },
  {
    label: 'Settings',
    items: [
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
]

/** Bottom nav primary tabs (max 3 + "Más"). */
export const PRIMARY_MOBILE_TABS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: Activity, end: true },
  { to: '/transactions', label: 'Transactions', icon: Receipt },
  { to: '/invoices', label: 'Invoices', icon: ScrollText },
]

const PRIMARY_MOBILE_PATHS = new Set(PRIMARY_MOBILE_TABS.map((t) => t.to))

/** Overflow routes shown in the mobile "Más" sheet. */
export const MOBILE_MENU_LINKS: NavItem[] = NAV_SECTIONS.flatMap((s) =>
  s.items.filter((item) => !PRIMARY_MOBILE_PATHS.has(item.to)),
)
