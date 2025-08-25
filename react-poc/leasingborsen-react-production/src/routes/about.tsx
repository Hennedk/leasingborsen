import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { RouteErrorBoundary } from '@/components/ErrorBoundaries'

const About = lazy(() => import('@/pages/About'))

export const Route = createFileRoute('/about')({
  component: () => (
    <RouteErrorBoundary routeName="Om os">
      <About />
    </RouteErrorBoundary>
  ),
})