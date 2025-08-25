import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { z } from 'zod'

const AdminSellerForm = lazy(() => import('@/pages/admin/AdminSellerForm'))

export const Route = createFileRoute('/admin/sellers/edit/$id')({
  parseParams: (params) => ({
    id: z.string().parse(params.id),
  }),
  component: AdminSellerForm,
})