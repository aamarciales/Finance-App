import { useAuth } from '@clerk/clerk-react'
import { useCallback, useEffect, useState } from 'react'

function isProtectedApiFile(path: string): boolean {
  return path.startsWith('/api/files/')
}

/** Fetch a private /api/files/* URL with Clerk JWT and expose a blob URL for <img> / preview. */
export function useAuthenticatedFileUrl(path: string | undefined | null) {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!path) {
      setUrl(null)
      setLoading(false)
      setError(false)
      return
    }

    if (!isProtectedApiFile(path)) {
      setUrl(path)
      setLoading(false)
      setError(false)
      return
    }

    if (!isLoaded || !isSignedIn) return

    let cancelled = false
    setLoading(true)
    setError(false)

    ;(async () => {
      try {
        const token = await getToken()
        if (!token) throw new Error('Missing auth token')

        const response = await fetch(path, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)

        const blob = await response.blob()
        if (cancelled) return
        setUrl(URL.createObjectURL(blob))
      } catch {
        if (!cancelled) {
          setUrl(null)
          setError(true)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      setUrl((prev) => {
        if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
        return null
      })
    }
  }, [path, getToken, isLoaded, isSignedIn])

  return { url, loading, error }
}

/** Open a protected file in a new tab (fetches with JWT, then blob URL). */
export function useOpenAuthenticatedFile() {
  const { getToken, isLoaded, isSignedIn } = useAuth()

  return useCallback(
    async (path: string | undefined | null) => {
      if (!path) return
      if (!isProtectedApiFile(path)) {
        window.open(path, '_blank', 'noopener,noreferrer')
        return
      }
      if (!isLoaded || !isSignedIn) return

      const token = await getToken()
      if (!token) return

      const response = await fetch(path, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) return

      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      window.open(blobUrl, '_blank', 'noopener,noreferrer')
    },
    [getToken, isLoaded, isSignedIn],
  )
}
