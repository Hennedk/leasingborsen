import React, { Suspense, useState, useEffect } from 'react'
import { createRootRoute, Outlet, useLocation } from '@tanstack/react-router'
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

// Enhanced page transition component with improved timing and subtle scale effects
const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [currentPath, setCurrentPath] = useState(location.pathname)

  useEffect(() => {
    if (location.pathname !== currentPath) {
      // Start exit animation
      setIsTransitioning(true)
      
      // After a short delay, update the path and start entrance animation
      const timer = setTimeout(() => {
        setCurrentPath(location.pathname)
        setIsTransitioning(false)
      }, 140) // Slightly less than total transition time for smooth overlap
      
      return () => clearTimeout(timer)
    }
  }, [location.pathname, currentPath])

  return (
    <div 
      className={`transition-all duration-[280ms] ease-[cubic-bezier(0.22,0.61,0.36,1)] ${
        isTransitioning 
          ? 'opacity-0 scale-[0.98] page-transition-exit' 
          : 'opacity-100 scale-100 page-transition-enter'
      }`}
      style={{ 
        minHeight: '100vh',
        transformOrigin: 'center top',
        willChange: 'transform, opacity'
      }}
    >
      {children}
    </div>
  )
}

// Loading component
const PageLoader: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
)

function RootComponent() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <div className="App" style={{backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))'}}>
          {/* Normal route content */}
          <Suspense fallback={<PageLoader />}>
            <PageTransition>
              <Outlet />
            </PageTransition>
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