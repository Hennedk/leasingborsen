import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { RouteErrorBoundary } from '@/components/ErrorBoundaries'

const AdminExtraction = lazy(() => import('@/pages/admin/AdminExtractionSessions'))

export const Route = createFileRoute('/admin/extraction')({
  component: () => (
    <RouteErrorBoundary routeName="Admin AI Extraction">
      <AdminExtraction />
    </RouteErrorBoundary>
  ),
})