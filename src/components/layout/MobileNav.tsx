import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { NavLink } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NAV_SECTIONS } from './nav-items'
import { TRMFooter } from './TRMFooter'

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(false)

  const close = useCallback(() => {
    setVisible(false)
    const timer = setTimeout(() => setOpen(false), 250)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (open) {
      setVisible(true)
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
        className="flex h-11 w-11 items-center justify-center rounded-md text-text-muted hover:bg-surface-2 md:hidden"
      >
        <Menu className="h-5 w-5" strokeWidth={1.8} />
      </button>

      {createPortal(
        open && (
          <>
            <div
              onClick={close}
              className={cn(
                'fixed inset-0 z-40 bg-[rgba(20,20,17,0.4)] backdrop-blur-sm md:hidden transition-opacity duration-200',
                visible ? 'opacity-100' : 'opacity-0',
              )}
            />
            <aside
              className={cn(
                'fixed bottom-0 left-0 top-0 z-50 flex w-[280px] flex-col overflow-y-auto bg-surface-2 px-5 py-5 md:hidden transition-transform duration-250 ease-[cubic-bezier(0.2,0.8,0.2,1)]',
                visible ? 'translate-x-0' : '-translate-x-full',
              )}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-baseline gap-2 px-2">
                  <span className="font-serif text-[22px] font-medium italic tracking-[-0.01em]">
                    Patrimonio
                  </span>
                  <span className="text-[11px] uppercase tracking-[0.08em] text-text-faint">
                    v0.1
                  </span>
                </div>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Cerrar menú"
                  className="flex h-11 w-11 items-center justify-center rounded-md text-text-muted hover:bg-surface"
                >
                  <X className="h-5 w-5" strokeWidth={1.8} />
                </button>
              </div>

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
                          onClick={close}
                          className={({ isActive }) =>
                            cn(
                              'flex min-h-[44px] select-none items-center gap-2.5 rounded-md px-3 py-2 text-[13.5px] text-text-muted transition-colors duration-100',
                              'hover:bg-black/[0.03] hover:text-text',
                              isActive &&
                                'bg-surface text-text shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-border',
                            )
                          }
                        >
                          <Icon
                            className="h-4 w-4 shrink-0 opacity-85"
                            strokeWidth={1.8}
                          />
                          <span>{item.label}</span>
                        </NavLink>
                      )
                    })}
                  </div>
                ))}
              </nav>

              <TRMFooter className="mt-auto" />
            </aside>
          </>
        ),
        document.body,
      )}
    </>
  )
}
