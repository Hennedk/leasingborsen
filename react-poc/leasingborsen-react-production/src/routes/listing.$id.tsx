import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { z } from 'zod'
import { ListingErrorBoundary } from '@/components/ErrorBoundaries'

const Listing = lazy(() => import('@/pages/Listing'))

export const Route = createFileRoute('/listing/$id')({
  parseParams: (params) => ({
    id: z.string().parse(params.id),
  }),
  component: () => (
    <ListingErrorBoundary>
      <Listing />
    </ListingErrorBoundary>
  ),
})