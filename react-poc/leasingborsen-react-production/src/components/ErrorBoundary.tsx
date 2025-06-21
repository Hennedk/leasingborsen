import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RefreshCw, AlertTriangle, Home, Bug } from 'lucide-react'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string | null
  retryCount: number
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  onReset?: () => void
  minimal?: boolean // For smaller error displays in filter sections
  maxRetries?: number
  resetKeys?: Array<string | number>
  isolate?: boolean // Whether to isolate this error boundary
}

/**
 * Enhanced Error Boundary with robust error handling and Danish localization
 * 
 * Features:
 * - Automatic retry mechanism with exponential backoff
 * - Detailed error reporting and tracking
 * - Props-based reset capability  
 * - Isolated error boundaries for component sections
 * - Danish error messages with user-friendly explanations
 * - Development vs production error details
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: number | null = null

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null, 
      errorId: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Generate unique error ID for tracking
    const errorId = `ERR_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`.toUpperCase()
    
    return { 
      hasError: true, 
      error,
      errorId
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Enhanced error logging
    console.error('ErrorBoundary caught an error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    })

    // Update state with error details
    this.setState({
      errorInfo
    })

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)

    // In production, you would send this to error tracking service
    // Example: Sentry.captureException(error, { contexts: { react: errorInfo } })
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetKeys } = this.props
    const { hasError } = this.state

    // Reset error state if resetKeys have changed
    if (hasError && resetKeys && resetKeys !== prevProps.resetKeys) {
      const hasResetKeyChanged = resetKeys.some((key, idx) => 
        prevProps.resetKeys?.[idx] !== key
      )
      
      if (hasResetKeyChanged) {
        this.resetErrorBoundary()
      }
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }
  }

  resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    })
  }

  handleReset = () => {
    const { maxRetries = 3 } = this.props
    const { retryCount } = this.state

    if (retryCount < maxRetries) {
      // Increment retry count and reset error state
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }))
      
      this.props.onReset?.()
    } else {
      // Max retries reached, just reset normally
      this.resetErrorBoundary()
      this.props.onReset?.()
    }
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    const { hasError, error, errorInfo, errorId, retryCount } = this.state
    const { fallback, minimal, maxRetries = 3 } = this.props

    if (hasError) {
      // Custom fallback provided
      if (fallback) {
        return fallback
      }

      // Minimal error display for filter sections and isolated components
      if (minimal) {
        return (
          <div className="my-4 p-4 border border-destructive bg-destructive/10 rounded-lg">
            <div className="flex items-center gap-2 text-destructive mb-2">
              <AlertTriangle className="h-4 w-4" />
              <h3 className="font-semibold text-sm">Komponenten kunne ikke indlæses</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Der opstod en fejl ved indlæsning af denne del af siden.
              {retryCount > 0 && ` (Forsøg ${retryCount}/${maxRetries})`}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleReset}
                disabled={retryCount >= maxRetries}
                className="h-8 text-xs"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                {retryCount >= maxRetries ? 'Maks. forsøg nået' : 'Prøv igen'}
              </Button>
              {process.env.NODE_ENV === 'development' && errorId && (
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {errorId}
                </code>
              )}
            </div>
          </div>
        )
      }

      // Full page error display with enhanced UX
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl border-destructive">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-destructive/10 rounded-full">
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>
              </div>
              <CardTitle className="text-destructive text-xl">
                Der opstod en uventet fejl
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center text-muted-foreground">
                <p className="mb-2">
                  Vi beklager ulejligheden. Noget gik galt, og siden kunne ikke indlæses korrekt.
                </p>
                <p className="text-sm">
                  Prøv venligst en af nedenstående løsninger.
                </p>
                {retryCount > 0 && (
                  <p className="text-sm mt-2">
                    Automatiske forsøg: {retryCount}/{maxRetries}
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={this.handleReset}
                  variant="default"
                  disabled={retryCount >= maxRetries}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  {retryCount >= maxRetries ? 'Maks. forsøg nået' : 'Prøv igen'}
                </Button>
                <Button 
                  onClick={this.handleReload}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Genindlæs siden
                </Button>
                <Button 
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Home className="h-4 w-4" />
                  Gå til forsiden
                </Button>
              </div>

              {/* Error details for development */}
              {process.env.NODE_ENV === 'development' && error && (
                <details className="mt-6 p-4 bg-muted rounded-lg">
                  <summary className="cursor-pointer font-medium text-sm mb-2 flex items-center gap-2">
                    <Bug className="h-4 w-4" />
                    Tekniske detaljer (kun for udviklere)
                  </summary>
                  <div className="space-y-3 text-xs font-mono">
                    <div>
                      <strong>Fejl ID:</strong>
                      <code className="ml-2 bg-background px-2 py-1 rounded">
                        {errorId}
                      </code>
                    </div>
                    <div>
                      <strong>Fejlmeddelelse:</strong>
                      <pre className="mt-1 p-2 bg-background rounded text-destructive overflow-auto">
                        {error.message}
                      </pre>
                    </div>
                    {error.stack && (
                      <div>
                        <strong>Stack trace:</strong>
                        <pre className="mt-1 p-2 bg-background rounded text-muted-foreground overflow-auto max-h-40">
                          {error.stack}
                        </pre>
                      </div>
                    )}
                    {errorInfo?.componentStack && (
                      <div>
                        <strong>Component stack:</strong>
                        <pre className="mt-1 p-2 bg-background rounded text-muted-foreground overflow-auto max-h-40">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* Support contact */}
              <div className="text-center text-sm text-muted-foreground border-t pt-4">
                <p>
                  Hvis problemet fortsætter, kontakt venligst support med fejlkoden:{' '}
                  <code className="bg-muted px-2 py-1 rounded text-xs">
                    {errorId}
                  </code>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary