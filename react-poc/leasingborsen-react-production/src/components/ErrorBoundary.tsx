import React from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw, AlertTriangle } from 'lucide-react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  onReset?: () => void
  minimal?: boolean // For smaller error displays in filter sections
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Minimal error display for filter sections
      if (this.props.minimal) {
        return (
          <div className="my-4 p-4 border border-destructive bg-destructive/10 rounded-lg">
            <div className="flex items-center gap-2 text-destructive mb-2">
              <AlertTriangle className="h-4 w-4" />
              <h3 className="font-semibold text-sm">Filteret kunne ikke indlæses</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Der opstod en fejl ved indlæsning af dette filter.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={this.handleReset}
              className="h-8 text-xs"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Prøv igen
            </Button>
          </div>
        )
      }

      // Full page error display
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-md mx-auto text-center">
            <div className="flex items-center justify-center gap-2 text-destructive mb-4">
              <AlertTriangle className="h-6 w-6" />
              <h1 className="text-2xl font-bold">
                Noget gik galt
              </h1>
            </div>
            <p className="text-muted-foreground mb-4">
              Der opstod en fejl i applikationen. Prøv at genindlæse siden.
            </p>
            <details className="text-left bg-muted p-4 rounded-lg mb-4">
              <summary className="cursor-pointer font-medium">Tekniske detaljer</summary>
              <pre className="mt-2 text-sm overflow-auto">
                {this.state.error?.message}
                {'\n\n'}
                {this.state.error?.stack}
              </pre>
            </details>
            <div className="flex gap-2 justify-center">
              <Button onClick={this.handleReset} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Prøv igen
              </Button>
              <Button onClick={() => window.location.reload()}>
                Genindlæs side
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary