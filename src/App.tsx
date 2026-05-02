import { useEffect, useState } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/routes'
import { ensureSeed } from '@/db/seed'

function App() {
  const [seeded, setSeeded] = useState(false)

  useEffect(() => {
    ensureSeed()
      .catch((err) => {
        console.error('seed failed', err)
      })
      .finally(() => setSeeded(true))
  }, [])

  if (!seeded) {
    /* Pantalla mínima mientras se inicializa Dexie + seed. <100ms en práctica. */
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-text-faint">
        <span className="font-serif italic">Cargando…</span>
      </div>
    )
  }

  return <RouterProvider router={router} />
}

export default App
