import { useAuth } from '@clerk/clerk-react'

// Utilidad base para hacer peticiones a la API inyectando el token JWT de Clerk
export function useApi() {
  const { getToken } = useAuth()

  const fetchApi = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
    const token = await getToken()
    
    const headers = new Headers(options.headers)
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
    headers.set('Content-Type', 'application/json')

    const response = await fetch(`/api${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`)
    }

    return response.json() as Promise<T>
  }

  return {
    get: <T>(endpoint: string) => fetchApi<T>(endpoint),
    post: <T>(endpoint: string, body: any) => fetchApi<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
    put: <T>(endpoint: string, body: any) => fetchApi<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
    delete: <T>(endpoint: string) => fetchApi<T>(endpoint, { method: 'DELETE' }),
  }
}
