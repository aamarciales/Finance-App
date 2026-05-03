import {
  Activity,
  CreditCard,
  FileText,
  History,
  LineChart,
  type LucideIcon,
  Receipt,
  ScrollText,
  Search,
  Settings,
  Shield,
  Target,
  Upload,
} from 'lucide-react'

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
    label: 'Resumen',
    items: [
      { to: '/', label: 'Dashboard', icon: Activity, end: true },
      { to: '/transactions', label: 'Transacciones', icon: Receipt },
      { to: '/invoices', label: 'Facturas', icon: ScrollText },
      { to: '/import', label: 'Importar', icon: Upload },
    ],
  },
  {
    label: 'Análisis',
    items: [
      { to: '/categories', label: 'Categorías', icon: LineChart },
      { to: '/insights', label: 'Análisis', icon: Search },
    ],
  },
  {
    label: 'Compromisos',
    items: [
      { to: '/tithe', label: 'Diezmo & Ofrendas', icon: Shield },
      { to: '/goals', label: 'Metas de ahorro', icon: Target },
      { to: '/debts', label: 'Deudas', icon: CreditCard },
      { to: '/taxes', label: 'Impuestos', icon: FileText },
    ],
  },
  {
    label: 'Configuración',
    items: [
      { to: '/historial', label: 'Historial', icon: History },
      { to: '/settings', label: 'Ajustes', icon: Settings },
    ],
  },
]
