import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { RouteErrorBoundary } from '@/components/ErrorBoundaries'

const AdminSettings = lazy(() => import('@/pages/admin/AdminSettings'))

export const Route = createFileRoute('/admin/settings')({
  component: () => (
    <RouteErrorBoundary routeName="Admin Settings">
      <AdminSettings />
    </RouteErrorBoundary>
  ),
})