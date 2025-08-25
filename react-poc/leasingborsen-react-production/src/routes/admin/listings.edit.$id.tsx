import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { z } from 'zod'

const AdminListingForm = lazy(() => import('@/pages/admin/AdminListingForm'))

export const Route = createFileRoute('/admin/listings/edit/$id')({
  parseParams: (params) => ({
    id: z.string().parse(params.id),
  }),
  component: AdminListingForm,
})