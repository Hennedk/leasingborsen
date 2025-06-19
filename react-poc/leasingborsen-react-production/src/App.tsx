import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { lazy, Suspense } from 'react'
import ErrorBoundary from '@/components/ErrorBoundary'
import BaseLayout from '@/components/BaseLayout'
import { Toaster } from '@/components/ui/sonner'

// Lazy load pages for code splitting
const Home = lazy(() => import('@/pages/Home'))
const Listings = lazy(() => import('@/pages/Listings'))
const Listing = lazy(() => import('@/pages/Listing'))
const About = lazy(() => import('@/pages/About'))
const WhyPrivateLeasing = lazy(() => import('@/pages/WhyPrivateLeasing'))
const Advertising = lazy(() => import('@/pages/Advertising'))

// Lazy load admin pages
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'))
const AdminListings = lazy(() => import('@/pages/admin/AdminListings'))
const AdminListingForm = lazy(() => import('@/pages/admin/AdminListingForm'))
const AdminSellers = lazy(() => import('@/pages/admin/AdminSellers'))
const AdminSellerForm = lazy(() => import('@/pages/admin/AdminSellerForm'))
const BatchReviewPage = lazy(() => import('@/pages/admin/BatchReviewPage'))

// Create a client with optimized configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 15 * 60 * 1000, // 15 minutes
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

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <div className="App" style={{backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))'}}>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/listings" element={<Listings />} />
                <Route path="/listing/:id" element={<Listing />} />
                <Route path="/about" element={<About />} />
                <Route path="/why-private-leasing" element={<WhyPrivateLeasing />} />
                <Route path="/advertising" element={<Advertising />} />
                
                {/* Admin routes */}
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/listings" element={<AdminListings />} />
                <Route path="/admin/listings/create" element={<AdminListingForm />} />
                <Route path="/admin/listings/edit/:id" element={<AdminListingForm />} />
                <Route path="/admin/sellers" element={<AdminSellers />} />
                <Route path="/admin/sellers/create" element={<AdminSellerForm />} />
                <Route path="/admin/sellers/edit/:id" element={<AdminSellerForm />} />
                <Route path="/admin/batch/:batchId/review" element={<BatchReviewPage />} />
                {/* Catch all route */}
                <Route path="*" element={
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
                } />
              </Routes>
            </Suspense>
          </div>
        </Router>
        <ReactQueryDevtools initialIsOpen={false} />
        <Toaster />
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App