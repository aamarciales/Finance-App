import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { NAV_SECTIONS } from './nav-items'
import { TRMFooter } from './TRMFooter'

/**
 * Sidebar fija (desktop ≥768px).
 * Visualmente: 240px, fondo `surface-2`, brand "Patrimonio v0.1" arriba,
 * secciones con label en uppercase, footer con TRM del día.
 */
export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 flex-col overflow-y-auto border-r border-border bg-surface-2 px-5 py-7 md:flex">
      <Brand />

      <nav className="flex flex-col">
        {NAV_SECTIONS.map((section, idx) => (
          <div key={section.label}>
            <div
              className={cn(
                'px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] text-text-faint',
                idx === 0 ? 'mt-0' : 'mt-4.5',
              )}
            >
              {section.label}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex select-none items-center gap-2.5 rounded-md px-3 py-2 text-[13.5px] text-text-muted transition-colors duration-100',
                      'hover:bg-black/[0.03] hover:text-text',
                      isActive &&
                        'bg-surface text-text shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-border',
                    )
                  }
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-85" strokeWidth={1.8} />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>

      <TRMFooter className="mt-auto" />
    </aside>
  )
}

import { UserButton } from '@clerk/clerk-react'

function Brand() {
  return (
    <div className="mb-8 flex items-center justify-between px-2">
      <div className="flex items-baseline gap-2">
        <span className="font-serif text-[22px] font-medium italic tracking-[-0.01em]">
          Patrimonio
        </span>
        <span className="text-[11px] uppercase tracking-[0.08em] text-text-faint">
          v0.1
        </span>
      </div>
      <UserButton />
    </div>
  )
}
