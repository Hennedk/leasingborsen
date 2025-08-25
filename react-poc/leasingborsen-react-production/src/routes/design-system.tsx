import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { RouteErrorBoundary } from '@/components/ErrorBoundaries'

const DesignSystemShowcase = lazy(() => import('@/pages/DesignSystemShowcase'))

export const Route = createFileRoute('/design-system')({
  component: () => (
    <RouteErrorBoundary routeName="Design System">
      <DesignSystemShowcase />
    </RouteErrorBoundary>
  ),
})