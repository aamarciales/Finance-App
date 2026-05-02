import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

/**
 * Shell raíz de la app. Layout grid:
 *  - desktop (≥768): sidebar 240px fija + main area
 *  - mobile (<768): TopBar arriba + main area; sidebar oculta (drawer)
 */
export function AppShell() {
  return (
    <div className="min-h-screen bg-bg text-text md:grid md:grid-cols-[240px_1fr]">
      <Sidebar />
      <div className="flex min-h-screen flex-col">
        <TopBar />
        <main className="mx-auto w-full max-w-[1320px] flex-1 px-5 pb-14 pt-6 md:px-10 md:pt-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
