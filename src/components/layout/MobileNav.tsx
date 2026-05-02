import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NAV_SECTIONS } from './nav-items'
import { TRMFooter } from './TRMFooter'

/**
 * Drawer mobile (<768px). Slide-in desde la izquierda con framer-motion
 * según especificación del README:
 *  - overlay oscuro 0.4
 *  - transición 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)
 *  - tocar overlay o item cierra
 *  - touch targets ≥44px
 */
export function MobileNav() {
  const [open, setOpen] = useState(false)

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

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="mobile-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] md:hidden"
            />
            <motion.aside
              key="mobile-drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
              className="fixed bottom-0 left-0 top-0 z-50 flex w-72 flex-col overflow-y-auto bg-surface-2 px-5 py-5 md:hidden"
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
                  onClick={() => setOpen(false)}
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
                          onClick={() => setOpen(false)}
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
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
