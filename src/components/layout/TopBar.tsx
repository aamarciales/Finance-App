import { Link } from 'react-router-dom'
import { Landmark, Settings } from 'lucide-react'
import { UserButton } from '@clerk/clerk-react'

/**
 * Mobile header — mirrors trakll App.tsx (solid bar + border, bottom pill nav).
 */
export function TopBar() {
  return (
    <header className="pt-mobile-header flex shrink-0 items-center justify-between border-b border-border px-4 py-3 lg:hidden">
      <div className="pt-brand !mb-0 min-w-0 !p-0">
        <div className="pt-brand-mark">
          <Landmark className="h-[17px] w-[17px] text-white" strokeWidth={2.1} aria-hidden />
        </div>
        <span className="pt-brand-name truncate">Patrimonio</span>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Link
          to="/settings"
          className="pt-icon-btn text-text-muted hover:bg-surface-2"
          aria-label="Settings"
        >
          <Settings className="h-4 w-4" strokeWidth={2} aria-hidden />
        </Link>
        <UserButton />
      </div>
    </header>
  )
}
