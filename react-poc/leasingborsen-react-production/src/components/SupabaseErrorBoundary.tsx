import React, { Component, type ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: any
  isOnline: boolean
}

export class SupabaseErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null

  constructor(props: Props) {
    super(props)
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isOnline: navigator.onLine
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Supabase Error Boundary caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo
    })

    // Check if this is a network-related error
    if (this.isNetworkError(error)) {
      this.handleNetworkError()
    }
  }

  componentDidMount() {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline)
    window.addEventListener('offline', this.handleOffline)
  }

  componentWillUnmount() {
    // Clean up event listeners
    window.removeEventListener('online', this.handleOnline)
    window.removeEventListener('offline', this.handleOffline)
    
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }
  }

  private isNetworkError = (error: Error): boolean => {
    const message = error.message.toLowerCase()
    return (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection') ||
      message.includes('timeout') ||
      message.includes('cors') ||
      error.name === 'TypeError' && message.includes('failed to fetch')
    )
  }

  private isSupabaseError = (error: Error): boolean => {
    const message = error.message.toLowerCase()
    return (
      message.includes('supabase') ||
      message.includes('postgrest') ||
      message.includes('authentication') ||
      message.includes('rls') ||
      message.includes('policy')
    )
  }

  private handleOnline = () => {
    this.setState({ isOnline: true })
    
    // Auto-retry when coming back online
    if (this.state.hasError && this.isNetworkError(this.state.error!)) {
      this.retryTimeoutId = setTimeout(() => {
        this.handleRetry()
      }, 1000)
    }
  }

  private handleOffline = () => {
    this.setState({ isOnline: false })
  }

  private handleNetworkError = () => {
    // Implement exponential backoff for network errors
    this.retryTimeoutId = setTimeout(() => {
      if (navigator.onLine) {
        this.handleRetry()
      }
    }, 5000)
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  private getErrorMessage = (): string => {
    const { error, isOnline } = this.state

    if (!isOnline) {
      return 'Ingen internetforbindelse. Tjek din forbindelse og prøv igen.'
    }

    if (!error) {
      return 'Der opstod en uventet fejl.'
    }

    if (this.isNetworkError(error)) {
      return 'Kunne ikke oprette forbindelse til serveren. Prøv igen om lidt.'
    }

    if (this.isSupabaseError(error)) {
      return 'Der opstod en fejl med databaseforbindelsen. Prøv igen eller kontakt support.'
    }

    // Generic error message in Danish
    return 'Der opstod en fejl ved indlæsning af data. Prøv at genindlæse siden.'
  }

  private getErrorIcon = () => {
    const { isOnline, error } = this.state

    if (!isOnline) {
      return <WifiOff className="h-12 w-12 text-destructive" />
    }

    if (error && this.isNetworkError(error)) {
      return <Wifi className="h-12 w-12 text-warning" />
    }

    return <AlertTriangle className="h-12 w-12 text-destructive" />
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-md border-destructive">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                {this.getErrorIcon()}
              </div>
              <CardTitle className="text-destructive">
                Noget gik galt
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-muted-foreground">
                {this.getErrorMessage()}
              </p>
              
              {!this.state.isOnline && (
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-sm text-center">
                    <WifiOff className="inline-block w-4 h-4 mr-1" />
                    Offline - venter på forbindelse...
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Button 
                  onClick={this.handleRetry}
                  disabled={!this.state.isOnline}
                  className="w-full"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Prøv igen
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => window.location.reload()}
                  className="w-full"
                >
                  Genindlæs siden
                </Button>
              </div>

              {/* Development error details */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-muted-foreground">
                    Fejldetaljer (kun i udvikling)
                  </summary>
                  <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                    {this.state.error.message}
                    {this.state.errorInfo && (
                      <>
                        {'\n\nComponent Stack:'}
                        {this.state.errorInfo.componentStack}
                      </>
                    )}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Functional component wrapper for easier usage
interface ErrorFallbackProps {
  error: Error
  resetError: () => void
}

export const SupabaseErrorFallback: React.FC<ErrorFallbackProps> = ({ 
  error, 
  resetError 
}) => {
  const isOnline = navigator.onLine
  
  const isNetworkError = (error: Error): boolean => {
    const message = error.message.toLowerCase()
    return (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection') ||
      message.includes('timeout')
    )
  }

  const getErrorMessage = (): string => {
    if (!isOnline) {
      return 'Ingen internetforbindelse. Tjek din forbindelse og prøv igen.'
    }

    if (isNetworkError(error)) {
      return 'Kunne ikke oprette forbindelse til serveren. Prøv igen om lidt.'
    }

    return 'Der opstod en fejl ved indlæsning af data. Prøv at genindlæse siden.'
  }

  return (
    <Card className="border-destructive">
      <CardContent className="pt-6">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
          <p className="text-sm text-muted-foreground">
            {getErrorMessage()}
          </p>
          <Button onClick={resetError} size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Prøv igen
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}