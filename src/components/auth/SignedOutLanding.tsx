import { SignIn } from '@clerk/clerk-react'
import { TRAKLL_URL } from '@/components/layout/nav-items'
import { isNativeMode, withNativeParam } from '@/lib/desktop-mode'

/** Full-screen sign-in when Clerk reports signed-out (no blocking isLoaded gate). */
export function SignedOutLanding() {
  if (isNativeMode()) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-bg p-4">
        <div className="mb-8 max-w-sm text-center">
          <h1 className="text-3xl font-extrabold tracking-[-0.02em] text-text">Patrimonio</h1>
          <p className="mt-2 text-text-muted">
            Open trakll to sign in; your account is shared across both apps.
          </p>
        </div>
        <a
          href={withNativeParam(TRAKLL_URL)}
          className="inline-flex h-11 items-center justify-center rounded-[13px] bg-text px-5 text-sm font-semibold text-bg"
        >
          Go to trakll
        </a>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg p-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold tracking-[-0.02em] text-text">Patrimonio</h1>
        <p className="mt-2 text-text-muted">Sign in to manage your finances</p>
      </div>
      <SignIn routing="hash" />
    </div>
  )
}
