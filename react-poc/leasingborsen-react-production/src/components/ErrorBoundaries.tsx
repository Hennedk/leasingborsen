import React from 'react'
import ErrorBoundary from './ErrorBoundary'
import { AlertTriangle, Database, Network, Search } from 'lucide-react'

/**
 * Specialized Error Boundaries for different application sections
 * 
 * These provide context-specific error handling with appropriate
 * fallbacks and recovery mechanisms.
 */

// Admin section error boundary with admin-specific styling
export const AdminErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ErrorBoundary
    fallback={
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-destructive/10 rounded-full">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-destructive mb-2">
            Admin Panel Fejl
          </h1>
          <p className="text-muted-foreground mb-4">
            Der opstod en fejl i admin panelet. Dette kan skyldes manglende tilladelser
            eller netværksproblemer.
          </p>
          <div className="space-y-2">
            <button 
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              Genindlæs panel
            </button>
            <button 
              onClick={() => window.location.href = '/admin'}
              className="w-full px-4 py-2 border border-border rounded-lg hover:bg-muted"
            >
              Gå til admin forside
            </button>
          </div>
        </div>
      </div>
    }
    maxRetries={2}
    onError={(error, errorInfo) => {
      // Admin-specific error tracking
      console.error('Admin Error:', { error, errorInfo, adminContext: true })
    }}
  >
    {children}
  </ErrorBoundary>
)

// Data fetching error boundary with network-aware recovery
export const DataErrorBoundary: React.FC<{ 
  children: React.ReactNode
  onRetry?: () => void
}> = ({ children, onRetry }) => (
  <ErrorBoundary
    minimal
    fallback={
      <div className="p-4 border border-destructive bg-destructive/10 rounded-lg my-4">
        <div className="flex items-center gap-2 text-destructive mb-2">
          <Database className="h-4 w-4" />
          <h3 className="font-semibold text-sm">Data kunne ikke indlæses</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Der opstod en fejl ved hentning af data. Tjek din internetforbindelse.
        </p>
        <button
          onClick={() => {
            onRetry?.()
            window.location.reload()
          }}
          className="text-xs bg-background border border-border px-3 py-1 rounded hover:bg-muted"
        >
          <Network className="w-3 h-3 mr-1 inline" />
          Prøv igen
        </button>
      </div>
    }
    maxRetries={5}
    onError={(error) => {
      // Data-specific error tracking
      console.error('Data Error:', { 
        error, 
        isNetworkError: error.message.includes('fetch') || error.message.includes('network'),
        timestamp: new Date().toISOString()
      })
    }}
  >
    {children}
  </ErrorBoundary>
)

// Search and filter error boundary with search context preservation
export const SearchErrorBoundary: React.FC<{ 
  children: React.ReactNode 
  searchContext?: string
}> = ({ children, searchContext }) => (
  <ErrorBoundary
    minimal
    fallback={
      <div className="p-4 border border-destructive bg-destructive/10 rounded-lg my-4">
        <div className="flex items-center gap-2 text-destructive mb-2">
          <Search className="h-4 w-4" />
          <h3 className="font-semibold text-sm">Søgning fejlede</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Søgefunktionen kunne ikke udføres. 
          {searchContext && ` Søgekontext: ${searchContext}`}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => window.location.reload()}
            className="text-xs bg-background border border-border px-3 py-1 rounded hover:bg-muted"
          >
            Genstart søgning
          </button>
          <button
            onClick={() => {
              // Clear search state and reload
              sessionStorage.removeItem('searchFilters')
              window.location.href = '/listings'
            }}
            className="text-xs bg-background border border-border px-3 py-1 rounded hover:bg-muted"
          >
            Ryd filtre
          </button>
        </div>
      </div>
    }
    maxRetries={3}
    resetKeys={searchContext ? [searchContext] : undefined}
  >
    {children}
  </ErrorBoundary>
)

// Listing detail error boundary with navigation fallback
export const ListingErrorBoundary: React.FC<{ 
  children: React.ReactNode
  listingId?: string 
}> = ({ children, listingId }) => (
  <ErrorBoundary
    fallback={
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-destructive/10 rounded-full">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-destructive mb-2">
            Annonce kunne ikke indlæses
          </h1>
          <p className="text-muted-foreground mb-4">
            Den ønskede bil-annonce kunne ikke vises. Dette kan skyldes at annoncen
            er blevet fjernet eller ikke eksisterer.
          </p>
          {listingId && (
            <p className="text-xs text-muted-foreground mb-4">
              Annonce ID: {listingId}
            </p>
          )}
          <div className="space-y-2">
            <button 
              onClick={() => window.location.href = '/listings'}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              Se alle annoncer
            </button>
            <button 
              onClick={() => window.history.back()}
              className="w-full px-4 py-2 border border-border rounded-lg hover:bg-muted"
            >
              Gå tilbage
            </button>
          </div>
        </div>
      </div>
    }
    resetKeys={listingId ? [listingId] : undefined}
    maxRetries={1}
  >
    {children}
  </ErrorBoundary>
)

// Batch upload error boundary with file operation recovery
export const BatchUploadErrorBoundary: React.FC<{ 
  children: React.ReactNode
  onRetry?: () => void
  onCancel?: () => void
}> = ({ children, onRetry, onCancel }) => (
  <ErrorBoundary
    fallback={
      <div className="p-6 border border-destructive bg-destructive/10 rounded-lg text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-destructive/20 rounded-full">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-destructive mb-2">
          Fil upload fejlede
        </h3>
        <p className="text-muted-foreground mb-4">
          Der opstod en fejl under behandling af filen. Dette kan skyldes:
        </p>
        <ul className="text-xs text-muted-foreground text-left mb-4 space-y-1">
          <li>• Filen er beskadiget eller i et ugyldigt format</li>
          <li>• Netværksforbindelse blev afbrudt</li>
          <li>• Serveren er midlertidigt utilgængelig</li>
        </ul>
        <div className="flex gap-2 justify-center">
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm"
            >
              Prøv igen
            </button>
          )}
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-border rounded-lg hover:bg-muted text-sm"
            >
              Annuller
            </button>
          )}
        </div>
      </div>
    }
    maxRetries={1}
    onError={(error, errorInfo) => {
      console.error('Batch Upload Error:', { error, errorInfo, context: 'file-upload' })
    }}
  >
    {children}
  </ErrorBoundary>
)

// Component isolation boundary for individual components
export const ComponentErrorBoundary: React.FC<{ 
  children: React.ReactNode
  componentName?: string
  isolate?: boolean
}> = ({ children, componentName, isolate = true }) => (
  <ErrorBoundary
    minimal
    isolate={isolate}
    fallback={
      <div className="p-3 border border-destructive bg-destructive/5 rounded text-center my-2">
        <AlertTriangle className="h-4 w-4 text-destructive mx-auto mb-1" />
        <p className="text-xs text-muted-foreground">
          {componentName ? `${componentName} fejlede` : 'Komponent fejlede'}
        </p>
      </div>
    }
    maxRetries={1}
  >
    {children}
  </ErrorBoundary>
)

// Route-level error boundary with route-specific recovery
export const RouteErrorBoundary: React.FC<{ 
  children: React.ReactNode
  routeName?: string
}> = ({ children, routeName }) => (
  <ErrorBoundary
    fallback={
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-destructive/10 rounded-full">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-destructive mb-2">
            Siden kunne ikke indlæses
          </h1>
          <p className="text-muted-foreground mb-4">
            {routeName ? `${routeName} siden` : 'Denne side'} kunne ikke indlæses korrekt.
            Prøv at navigere til en anden side eller genindlæs siden.
          </p>
          <div className="space-y-2">
            <button 
              onClick={() => window.location.href = '/'}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              Gå til forsiden
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 border border-border rounded-lg hover:bg-muted"
            >
              Genindlæs siden
            </button>
          </div>
        </div>
      </div>
    }
    maxRetries={2}
    onError={(error, errorInfo) => {
      // Route-specific error tracking
      console.error('Route Error:', { 
        error, 
        errorInfo, 
        route: routeName || window.location.pathname,
        timestamp: new Date().toISOString()
      })
    }}
  >
    {children}
  </ErrorBoundary>
)