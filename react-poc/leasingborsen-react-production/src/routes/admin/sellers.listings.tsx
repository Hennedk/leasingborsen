import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'

const AdminSellerListings = lazy(() => import('@/pages/admin/AdminSellerListings'))

export const Route = createFileRoute('/admin/sellers/listings')({
  component: AdminSellerListings,
})