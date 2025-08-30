import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { z } from 'zod'
import { ListingErrorBoundary } from '@/components/ErrorBoundaries'

const Listing = lazy(() => import('@/pages/Listing'))

const searchSchema = z.object({
  selectedDeposit: z.coerce.number().optional(),
  selectedMileage: z.coerce.number().optional(),
  selectedTerm: z.coerce.number().optional(),
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