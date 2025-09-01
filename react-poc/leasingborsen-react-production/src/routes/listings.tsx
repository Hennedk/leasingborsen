import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { z } from 'zod'
import { RouteErrorBoundary } from '@/components/ErrorBoundaries'
import { LEASE_DEFAULTS } from '@/lib/leaseConfigMapping'

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
  
  // Lease configuration parameters - use centralized defaults
  km: z.number().int().optional(), // km per year
  mdr: z.number().int().catch(LEASE_DEFAULTS.term), // lease months
  udb: z.number().catch(LEASE_DEFAULTS.deposit), // down payment
  
  // Sorting
  sort: z.enum(['lease_score_desc','asc','desc']).catch('lease_score_desc'),
  
  // View preferences  
  view: z.enum(['grid','list']).catch('grid'),
  
  // Search query
  q: z.string().optional(),
  
  // Mobile filter overlay trigger
  showFilters: z.string().optional(),
}).catch(() => ({
  page: 1,
  limit: 20,
  sort: 'lease_score_desc' as const,
  view: 'grid' as const,
  mdr: LEASE_DEFAULTS.term,
  udb: LEASE_DEFAULTS.deposit,
})) // Fallback with defaults for invalid searches

export const Route = createFileRoute('/listings')({
  validateSearch: listingsSearchSchema,
  component: () => (
    <RouteErrorBoundary routeName="Bil annoncer">
      <Listings />
    </RouteErrorBoundary>
  ),
})