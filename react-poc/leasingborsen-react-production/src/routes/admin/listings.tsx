import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { z } from 'zod'

const AdminListings = lazy(() => import('@/pages/admin/AdminListings'))

const adminListingsSearchSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['active','inactive','pending']).optional(),
  seller_id: z.string().optional(),
  page: z.number().catch(1),
}).catch(() => ({ page: 1 }))

export const Route = createFileRoute('/admin/listings')({
  validateSearch: adminListingsSearchSchema,
  component: AdminListings,
})