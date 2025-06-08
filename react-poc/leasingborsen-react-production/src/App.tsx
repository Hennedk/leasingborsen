import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useThemeStore } from '@/stores/themeStore'
import { lazy, Suspense } from 'react'
import ErrorBoundary from '@/components/ErrorBoundary'

// Lazy load pages for code splitting
const Home = lazy(() => import('@/pages/Home'))
const Listings = lazy(() => import('@/pages/Listings'))
const Listing = lazy(() => import('@/pages/Listing'))
const About = lazy(() => import('@/pages/About'))

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// Loading component
const PageLoader: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
)

function App() {
  const { initTheme } = useThemeStore((state) => ({ 
    initTheme: state.initTheme
  }))

  useEffect(() => {
    // Initialize theme only once
    initTheme()
  }, [initTheme])

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <div className="App min-h-screen bg-background text-foreground" style={{backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))'}}>
            <Suspense fallback={<PageLoader />}>
              <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/listings" element={<Listings />} />
              <Route path="/listing/:id" element={<Listing />} />
              <Route path="/about" element={<About />} />
              {/* Catch all route */}
              <Route path="*" element={
                <div className="min-h-screen flex items-center justify-center bg-background">
                  <div className="text-center">
                    <h1 className="text-4xl font-bold text-foreground mb-4">404</h1>
                    <p className="text-muted-foreground mb-4">Siden blev ikke fundet</p>
                    <a href="/" className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90 transition-colors">
                      Gå til forsiden
                    </a>
                  </div>
                </div>
              } />
            </Routes>
            </Suspense>
          </div>
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App