import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { z } from 'zod'
import { ListingErrorBoundary } from '@/components/ErrorBoundaries'

const Listing = lazy(() => import('@/pages/Listing'))

const searchSchema = z.object({
  // New parameter names (preferred)
  selectedDeposit: z.coerce.number().optional(),
  selectedMileage: z.coerce.number().optional(),
  selectedTerm: z.coerce.number().optional(),
  
  // Legacy parameter names for backward compatibility
  udb: z.coerce.number().optional(),
  km: z.coerce.number().optional(), 
  mdr: z.coerce.number().optional(),
})

export const Route = createFileRoute('/listing/$id')({
  parseParams: (params) => ({
    id: z.string().parse(params.id),
  }),
  validateSearch: searchSchema,
  component: () => (
    <ListingErrorBoundary>
      <Listing />
    </ListingErrorBoundary>
  ),
})