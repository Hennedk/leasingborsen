import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'

const AdminSellerForm = lazy(() => import('@/pages/admin/AdminSellerForm'))

export const Route = createFileRoute('/admin/sellers/create')({
  component: AdminSellerForm,
})