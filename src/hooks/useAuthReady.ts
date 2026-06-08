import { useAuth } from '@clerk/clerk-react'

/** True once Clerk finished loading and the user has an active session. */
export function useAuthReady(): boolean {
  const { isLoaded, isSignedIn } = useAuth()
  return isLoaded && isSignedIn
}
