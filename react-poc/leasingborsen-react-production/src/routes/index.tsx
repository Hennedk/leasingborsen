import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { RouteErrorBoundary } from '@/components/ErrorBoundaries'

const Home = lazy(() => import('@/pages/Home'))

export const Route = createFileRoute('/')({
  component: () => (
    <RouteErrorBoundary routeName="Forside">
      <Home />
    </RouteErrorBoundary>
  ),
})