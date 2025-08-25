import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { z } from 'zod'
import { RouteErrorBoundary } from '@/components/ErrorBoundaries'

const Listings = lazy(() => import('@/pages/Listings'))

const listingsSearchSchema = z.object({
  // Pagination
  page: z.number().int().min(1).catch(1),
  limit: z.number().int().min(10).max(50).catch(20),
  
  // Basic filters
  make: z.string().optional(),
  model: z.string().optional(),
  makes: z.array(z.string()).optional(),
  models: z.array(z.string()).optional(),
  body_type: z.union([z.string(), z.array(z.string())]).optional(),
  fuel_type: z.enum(['petrol','diesel','hybrid','plugin_hybrid','electric']).optional(),
  transmission: z.enum(['manual','automatic']).optional(),
  
  // Price range
  price_min: z.number().optional(),
  price_max: z.number().optional(),
  
  // Seats
  seats_min: z.number().optional(),
  seats_max: z.number().optional(),
  
  // Other filters
  horsepower_min: z.number().optional(),
  horsepower_max: z.number().optional(),
  
  // Lease configuration parameters
  km: z.number().int().catch(15000), // km per year
  mdr: z.number().int().catch(36), // lease months
  udb: z.number().catch(0), // down payment
  
  // Sorting
  sort: z.enum(['price_asc','price_desc','newest','score_desc']).catch('newest'),
  
  // View preferences  
  view: z.enum(['grid','list']).catch('grid'),
  
  // Search query
  q: z.string().optional(),
  
  // Mobile filter overlay trigger
  showFilters: z.string().optional(),
}).catch(() => ({
  page: 1,
  limit: 20,
  sort: 'newest' as const,
  view: 'grid' as const,
  km: 15000,
  mdr: 36,
  udb: 0,
})) // Fallback with defaults for invalid searches // Fallback with defaults for invalid searches

export const Route = createFileRoute('/listings')({
  validateSearch: listingsSearchSchema,
  component: () => (
    <RouteErrorBoundary routeName="Bil annoncer">
      <Listings />
    </RouteErrorBoundary>
  ),
})