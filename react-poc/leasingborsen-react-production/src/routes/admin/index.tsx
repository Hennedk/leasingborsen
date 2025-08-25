import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'

const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'))

export const Route = createFileRoute('/admin/')({
  component: AdminDashboard,
})