import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { RouteErrorBoundary } from '@/components/ErrorBoundaries'

const Advertising = lazy(() => import('@/pages/Advertising'))

export const Route = createFileRoute('/advertising')({
  component: () => (
    <RouteErrorBoundary routeName="Annoncering">
      <Advertising />
    </RouteErrorBoundary>
  ),
})