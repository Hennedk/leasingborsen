import React from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface ErrorBoundaryProps {
  children: React.ReactNode
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

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-md mx-auto text-center">
            <h1 className="text-2xl font-bold text-destructive mb-4">
              Noget gik galt
            </h1>
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
            <button 
              onClick={() => window.location.reload()}
              className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90"
            >
              Genindlæs side
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary