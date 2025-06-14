import React, { Component } from 'react'
import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import { Link } from 'react-router-dom'

interface ErrorInfo {
  componentStack: string
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>
  showDetails?: boolean
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return (
        <FallbackComponent 
          error={this.state.error!} 
          retry={this.handleRetry}
        />
      )
    }

    return this.props.children
  }
}

interface ErrorFallbackProps {
  error: Error
  retry: () => void
  showDetails?: boolean
}

const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ 
  error, 
  retry,
  showDetails = false
}) => (
  <Card className="border-destructive max-w-md mx-auto">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-destructive">
        <AlertCircle className="w-5 h-5" />
        Der opstod en fejl
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <p className="text-muted-foreground">
        {error.message || 'En uventet fejl opstod i applikationen'}
      </p>
      
      {showDetails && (
        <details className="text-sm text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground">
            Tekniske detaljer
          </summary>
          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
            {error.stack}
          </pre>
        </details>
      )}
      
      <div className="flex gap-2">
        <Button onClick={retry} variant="outline" className="flex-1">
          <RefreshCw className="w-4 h-4 mr-2" />
          Prøv igen
        </Button>
        <Button asChild variant="default" className="flex-1">
          <Link to="/">
            <Home className="w-4 h-4 mr-2" />
            Startside
          </Link>
        </Button>
      </div>
    </CardContent>
  </Card>
)

// Compact error fallback for inline use
export const CompactErrorFallback: React.FC<ErrorFallbackProps> = ({ 
  error, 
  retry 
}) => (
  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-center">
    <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
    <p className="text-sm text-destructive mb-3">
      {error.message || 'Indlæsningsfejl'}
    </p>
    <Button onClick={retry} size="sm" variant="outline">
      <RefreshCw className="w-3 h-3 mr-1" />
      Prøv igen
    </Button>
  </div>
)

// Hook for programmatic error handling
export const useErrorHandler = () => {
  return (error: Error, errorInfo?: any) => {
    console.error('Application error:', error, errorInfo)
    // You could send to error reporting service here
  }
}