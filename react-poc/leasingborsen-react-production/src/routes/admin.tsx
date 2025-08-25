import { createFileRoute, Outlet } from '@tanstack/react-router'
import { AdminErrorBoundary } from '@/components/ErrorBoundaries'

function AdminLayout() {
  return (
    <AdminErrorBoundary>
      <Outlet />
    </AdminErrorBoundary>
  )
}

export const Route = createFileRoute('/admin')({
  component: AdminLayout,
})