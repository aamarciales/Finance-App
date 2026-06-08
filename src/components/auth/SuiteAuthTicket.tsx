import { useEffect, useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { useSignIn } from '@clerk/clerk-react'
import { homePathWithNativeParams } from '@/lib/desktop-mode'

function stripTicketFromUrl() {
  const url = new URL(window.location.href)
  url.searchParams.delete('ticket')
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
}

/** Consume a short-lived Clerk ticket passed from the other suite app. */
export function SuiteAuthTicket() {
  const ticket = new URLSearchParams(window.location.search).get('ticket')
  const { isLoaded: userLoaded, isSignedIn } = useUser()
  const { isLoaded: signInLoaded, signIn, setActive } = useSignIn()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!ticket || !userLoaded || !signInLoaded || isSignedIn || !signIn) return

    const authTicket = ticket
    const activeSignIn = signIn
    const activateSession = setActive
    let cancelled = false

    async function completeSignIn() {
      try {
        const result = await activeSignIn.create({ strategy: 'ticket', ticket: authTicket })
        if (!result.createdSessionId) {
          throw new Error('Missing session')
        }
        await activateSession({ session: result.createdSessionId })
        stripTicketFromUrl()
        if (!cancelled) window.location.href = homePathWithNativeParams()
      } catch {
        if (!cancelled) setError('Could not complete sign-in.')
      }
    }

    void completeSignIn()

    return () => {
      cancelled = true
    }
  }, [isSignedIn, setActive, signIn, signInLoaded, ticket, userLoaded])

  if (!ticket || isSignedIn) return null

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg p-4">
      <div className="w-full max-w-sm space-y-3 rounded-card border border-line bg-card p-8 text-center shadow-sm">
        <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-text">Patrimonio</h1>
        <p className="text-sm text-text-muted">
          {error ?? 'Connecting your session…'}
        </p>
      </div>
    </div>
  )
}
