import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { z } from 'zod'

const AdminSellerListings = lazy(() => import('@/pages/admin/AdminSellerListings'))

export const Route = createFileRoute('/admin/sellers/listings')({
  validateSearch: z.object({
    seller: z.string().optional(),
    search: z.string().optional(),
    page: z.number().int().min(1).catch(1),
    limit: z.number().int().min(10).max(100).catch(20),
  }).catch(() => ({
    page: 1,
    limit: 20,
  })),
  component: AdminSellerListings,
})