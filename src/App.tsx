import { useAuth } from '@clerk/clerk-react'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/routes'

import { ClerkProvider, SignedIn, SignedOut, SignIn } from '@clerk/clerk-react'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key")
}

function AppContent() {
  const { isLoaded } = useAuth()

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-text-faint">
        <span className="font-serif italic">Cargando…</span>
      </div>
    )
  }

  return (
    <>
      <SignedIn>
        <RouterProvider router={router} />
      </SignedIn>
      <SignedOut>
        <div className="flex min-h-screen flex-col items-center justify-center bg-bg p-4">
          <div className="mb-8 text-center">
            <h1 className="font-serif text-3xl font-bold text-text">Patrimonio</h1>
            <p className="text-text-muted mt-2">Inicia sesión para gestionar tus finanzas</p>
          </div>
          <SignIn routing="hash" />
        </div>
      </SignedOut>
    </>
  )
}

export default function App() {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <AppContent />
    </ClerkProvider>
  )
}
