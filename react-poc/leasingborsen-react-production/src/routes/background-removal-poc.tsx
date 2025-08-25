import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { RouteErrorBoundary } from '@/components/ErrorBoundaries'

const BackgroundRemovalPOC = lazy(() => import('@/pages/BackgroundRemovalPOC'))

export const Route = createFileRoute('/background-removal-poc')({
  component: () => (
    <RouteErrorBoundary routeName="Background Removal POC">
      <BackgroundRemovalPOC />
    </RouteErrorBoundary>
  ),
})