import { useAuth, useClerk } from '@clerk/clerk-react'
import { useCallback, useMemo } from 'react'

class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// Base API client — injects Clerk JWT once the session is ready.
export function useApi() {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const { signOut } = useClerk()

  const fetchApi = useCallback(
    async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
      if (!isLoaded) {
        throw new ApiError('AUTH_NOT_READY', 0)
      }
      if (!isSignedIn) {
        throw new ApiError('AUTH_SIGNED_OUT', 0)
      }

      const token = await getToken()
      if (!token) {
        throw new ApiError('AUTH_NO_TOKEN', 0)
      }

      const headers = new Headers(options.headers)
      headers.set('Authorization', `Bearer ${token}`)
      headers.set('Content-Type', 'application/json')

      const response = await fetch(`/api${endpoint}`, {
        ...options,
        headers,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const message =
          (errorData as { error?: string }).error ||
          `Error ${response.status}: ${response.statusText}`

        if (response.status === 401) {
          void signOut()
          throw new ApiError('Invalid session. Sign in again.', 401)
        }

        throw new ApiError(message, response.status)
      }

      return response.json() as Promise<T>
    },
    [getToken, isLoaded, isSignedIn, signOut],
  )

  return useMemo(
    () => ({
      get: <T>(endpoint: string) => fetchApi<T>(endpoint),
      post: <T>(endpoint: string, body: unknown) =>
        fetchApi<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
      put: <T>(endpoint: string, body: unknown) =>
        fetchApi<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
      delete: <T>(endpoint: string) => fetchApi<T>(endpoint, { method: 'DELETE' }),
    }),
    [fetchApi],
  )
}

export { ApiError }
