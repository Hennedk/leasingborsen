import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { RouteErrorBoundary } from '@/components/ErrorBoundaries'

const WhyPrivateLeasing = lazy(() => import('@/pages/WhyPrivateLeasing'))

export const Route = createFileRoute('/why-private-leasing')({
  component: () => (
    <RouteErrorBoundary routeName="Privatleasing guide">
      <WhyPrivateLeasing />
    </RouteErrorBoundary>
  ),
})