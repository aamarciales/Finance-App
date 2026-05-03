import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import DashboardPage from '@/pages/Dashboard'
import TransactionsPage from '@/pages/Transactions'
import InvoicesPage from '@/pages/Invoices'
import ImportPage from '@/pages/Import'
import CategoriesPage from '@/pages/Categories'
import TithePage from '@/pages/Tithe'
import GoalsPage from '@/pages/Goals'
import DebtsPage from '@/pages/Debts'
import TaxesPage from '@/pages/Taxes'
import InsightsPage from '@/pages/Insights'
import ReportsPage from '@/pages/Reports'
import SettingsPage from '@/pages/Settings'
import AuditLogPage from '@/pages/AuditLog'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'transactions', element: <TransactionsPage /> },
      { path: 'invoices', element: <InvoicesPage /> },
      /* `/invoices/:id` se materializa en Fase 4 (drill-down). Por ahora
         redirige a la lista para evitar un 404 si alguien navega allí. */
      { path: 'invoices/:id', element: <Navigate to="/invoices" replace /> },
      { path: 'import', element: <ImportPage /> },
      { path: 'categories', element: <CategoriesPage /> },
      { path: 'tithe', element: <TithePage /> },
      { path: 'goals', element: <GoalsPage /> },
      { path: 'debts', element: <DebtsPage /> },
      { path: 'taxes', element: <TaxesPage /> },
      { path: 'insights', element: <InsightsPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'historial', element: <AuditLogPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
