import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { z } from 'zod'

const BatchReviewPage = lazy(() => import('@/pages/admin/BatchReviewPage'))

export const Route = createFileRoute('/admin/batches/$batchId/review')({
  parseParams: (params) => ({
    batchId: z.string().parse(params.batchId),
  }),
  component: BatchReviewPage,
})