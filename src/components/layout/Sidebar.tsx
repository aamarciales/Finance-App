import { NavLink, useNavigate } from 'react-router-dom'
import { ExternalLink, Landmark } from 'lucide-react'
import { useUser } from '@clerk/clerk-react'
import { NAV_SECTIONS, TRAKLL_URL } from './nav-items'
import { TrakllSuiteLink } from '@/components/layout/TrakllSuiteLink'
import { TRMFooter } from './TRMFooter'

/**
 * Desktop sidebar (lg+). Mirrors trakll AppSidebar: 218px, nav + TRM + profile at bottom.
 */
export function Sidebar() {
  const { user } = useUser()
  const navigate = useNavigate()

  const displayName =
    user?.fullName ?? user?.primaryEmailAddress?.emailAddress?.split('@')[0] ?? 'Usuario'
  const email = user?.primaryEmailAddress?.emailAddress ?? ''

  return (
    <aside className="pt-side" aria-label="Main navigation">
      <div className="pt-brand">
        <div className="pt-brand-mark">
          <Landmark className="h-[17px] w-[17px] text-white" strokeWidth={2.1} aria-hidden />
        </div>
        <span className="pt-brand-name">Patrimonio</span>
      </div>

      {NAV_SECTIONS.map((section) => (
        <div key={section.label} className="pt-nav-section">
          <div className="pt-nav-section-label">{section.label}</div>
          <nav className="pt-nav">
            {section.items.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => (isActive ? 'on' : undefined)}
                >
                  <Icon className="ic h-[18px] w-[18px] shrink-0" strokeWidth={1.9} aria-hidden />
                  {item.label}
                </NavLink>
              )
            })}
          </nav>
        </div>
      ))}

      <div className="pt-spacer" />

      <TrakllSuiteLink href={TRAKLL_URL} className="pt-external-link">
        <ExternalLink className="ic h-[18px] w-[18px] shrink-0 text-text-faint" strokeWidth={1.9} aria-hidden />
        Trakll
      </TrakllSuiteLink>

      <TRMFooter className="mt-3" />

      <button
        type="button"
        className="pt-profile mt-3"
        onClick={() => navigate('/settings')}
      >
        {user?.imageUrl ? (
          <img src={user.imageUrl} alt="" />
        ) : (
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-3 text-sm font-bold text-text-muted"
            aria-hidden
          >
            {displayName.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <div className="nm">{displayName}</div>
          {email ? <div className="em">{email}</div> : null}
        </div>
      </button>
    </aside>
  )
}
