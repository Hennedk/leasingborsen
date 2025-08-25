import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'

const AdminListingForm = lazy(() => import('@/pages/admin/AdminListingForm'))

export const Route = createFileRoute('/admin/listings/create')({
  component: AdminListingForm,
})