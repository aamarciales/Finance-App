import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
          <AlertTriangle className="h-10 w-10 text-warning" />
          <h2 className="font-serif text-xl">Algo salió mal</h2>
          <p className="max-w-md text-[13px] text-text-muted">
            Ocurrió un error inesperado. Intenta recargar la página.
          </p>
          <Button onClick={() => window.location.reload()}>Recargar</Button>
        </div>
      )
    }
    return this.props.children
  }
}
