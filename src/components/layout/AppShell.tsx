import { SignedIn, SignedOut } from '@clerk/clerk-react'
import { Outlet } from 'react-router-dom'
import { SignedOutLanding } from '@/components/auth/SignedOutLanding'
import { SuiteAuthTicket } from '@/components/auth/SuiteAuthTicket'
import { DesktopWindowChrome } from './DesktopWindowChrome'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { MobileNav } from './MobileNav'

/**
 * Root app shell — trakll family layout:
 *  - desktop (lg+): 218px sidebar + main
 *  - mobile: scroll on <main>, glass top bar + floating pill bottom nav
 *
 * Auth gates live here (not a global isLoaded block) so the shell can mount
 * immediately while Clerk hydrates — same pattern as trakll AppLayout.
 */
export function AppShell() {
  const hasTicket = new URLSearchParams(window.location.search).has('ticket')

  return (
    <>
      <SuiteAuthTicket />
      <SignedOut>
        {hasTicket ? null : <SignedOutLanding />}
      </SignedOut>
      <SignedIn>
        <DesktopWindowChrome />
        <div className="pt-stage min-h-dvh w-full bg-bg text-text">
          <div className="pt-frame flex w-full">
            <Sidebar />

            <div className="pt-main flex min-h-0 min-w-0 flex-1 flex-col">
              <TopBar />
              <main className="mx-auto flex min-h-0 w-full max-w-[1320px] flex-1 flex-col overflow-x-hidden pb-[calc(5.75rem+env(safe-area-inset-bottom))] lg:overflow-y-auto lg:px-[26px] lg:pb-6 lg:pt-2">
                <div className="flex-1 px-3.5 pt-4 lg:px-0 lg:pt-2">
                  <Outlet />
                </div>
              </main>
            </div>
          </div>

          <MobileNav />
        </div>
      </SignedIn>
    </>
  )
}
