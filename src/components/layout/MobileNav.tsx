import { useEffect, useState, type CSSProperties } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ExternalLink, MoreHorizontal, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MOBILE_MENU_LINKS, PRIMARY_MOBILE_TABS, TRAKLL_URL } from './nav-items'
import { TrakllSuiteLink } from '@/components/layout/TrakllSuiteLink'

function isPrimaryActive(pathname: string, to: string, end?: boolean) {
  if (end) return pathname === to
  return pathname === to || pathname.startsWith(`${to}/`)
}

function isMenuActive(pathname: string) {
  return MOBILE_MENU_LINKS.some(
    (l) => pathname === l.to || pathname.startsWith(`${l.to}/`),
  )
}

/** Vite/LightningCSS drops unprefixed backdrop-filter from index.css; inline keeps both (trakll tf.css keeps both). */
const MOBILE_NAV_PILL_GLASS: CSSProperties = {
  backdropFilter: 'blur(24px) saturate(180%)',
  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
}

/** Floating glass pill bottom nav — mirrors trakll mobile pattern. */
export function MobileNav() {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuActive = isMenuActive(location.pathname)

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  return (
    <>
      <nav
        id="app-bottom-nav"
        className="pt-mobile-nav-float lg:hidden"
        aria-label="Main navigation"
      >
        <div className="pt-mobile-nav-pill" style={MOBILE_NAV_PILL_GLASS}>
          {PRIMARY_MOBILE_TABS.map((tab) => {
            const Icon = tab.icon
            const active = isPrimaryActive(location.pathname, tab.to, tab.end)
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={cn('pt-mobile-nav-tab', active && 'on')}
              >
                <Icon className="h-[22px] w-[22px] shrink-0 stroke-[2]" aria-hidden />
                <span className="pt-mobile-nav-label">{tab.label}</span>
              </NavLink>
            )
          })}
          <button
            type="button"
            className={cn('pt-mobile-nav-tab', (menuOpen || menuActive) && 'on')}
            aria-expanded={menuOpen}
            aria-haspopup="dialog"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <MoreHorizontal className="h-[22px] w-[22px] shrink-0 stroke-[2]" aria-hidden />
            <span className="pt-mobile-nav-label">More</span>
          </button>
        </div>
      </nav>

      {menuOpen ? (
        <div
          className="pt-mobile-menu-overlay lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="More options"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="pt-mobile-menu-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-bold">More</span>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-border bg-surface text-text-muted hover:bg-surface-2"
                aria-label="Close"
                onClick={() => setMenuOpen(false)}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <ul className="flex flex-col gap-1">
              {MOBILE_MENU_LINKS.map((link) => {
                const Icon = link.icon
                return (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="flex items-center gap-3 rounded-[12px] px-3 py-3 text-[15px] font-semibold hover:bg-surface-2"
                      onClick={() => setMenuOpen(false)}
                    >
                      <Icon className="h-[18px] w-[18px] stroke-[2]" aria-hidden />
                      {link.label}
                    </Link>
                  </li>
                )
              })}
              <li>
                <TrakllSuiteLink
                  href={TRAKLL_URL}
                  className="flex items-center gap-3 rounded-[12px] px-3 py-3 text-[15px] font-semibold hover:bg-surface-2"
                  onClick={() => setMenuOpen(false)}
                >
                  <ExternalLink className="h-[18px] w-[18px] stroke-[2]" aria-hidden />
                  Trakll
                </TrakllSuiteLink>
              </li>
            </ul>
          </div>
        </div>
      ) : null}
    </>
  )
}
