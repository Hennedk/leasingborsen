import React, { Suspense, useEffect } from 'react'
import { createRootRoute, Outlet } from '@tanstack/react-router'
import SafeContentFade from '@/components/SafeContentFade'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import ErrorBoundary from '@/components/ErrorBoundary'
import BaseLayout from '@/components/BaseLayout'
import { Toaster } from '@/components/ui/sonner'
import { QueryClient } from '@tanstack/react-query'

// Create a client with optimized configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 20 * 60 * 1000, // 20 minutes - increased for better back navigation
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          return false
        }
        // Retry up to 2 times for server errors
        return failureCount < 2
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: 'always',
      // Network detection
      networkMode: 'online',
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
      networkMode: 'online',
      onError: (error) => {
        console.error('Mutation failed:', error)
        // Here you could show a global error toast/notification
      },
    },
  },
})


// Loading component
const PageLoader: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
)

function RootComponent() {
  // Mark recent browser history POPs to help hooks detect real Back navigation in SPA
  useEffect(() => {
    const onPop = () => {
      try {
        sessionStorage.setItem('leasingborsen-history-pop-ts', String(Date.now()))
      } catch {
        // ignore sessionStorage errors
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <div className="App" style={{backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))'}}>
          {/* Normal route content */}
          <Suspense fallback={<PageLoader />}>
            <SafeContentFade>
              <Outlet />
            </SafeContentFade>
          </Suspense>
        </div>
        <ReactQueryDevtools initialIsOpen={false} />
        <Toaster />
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

function NotFoundComponent() {
  return (
    <BaseLayout>
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">404</h1>
          <p className="text-muted-foreground mb-4">Siden blev ikke fundet</p>
          <a href="/" className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90 transition-colors">
            Gå til forsiden
          </a>
        </div>
      </div>
    </BaseLayout>
  )
}

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
})
