import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'

const AdminSellers = lazy(() => import('@/pages/admin/AdminSellers'))

export const Route = createFileRoute('/admin/sellers')({
  component: AdminSellers,
})