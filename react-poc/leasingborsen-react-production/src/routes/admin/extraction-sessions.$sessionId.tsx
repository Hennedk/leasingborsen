import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { z } from 'zod'

const AdminExtractionSessions = lazy(() => import('@/pages/admin/AdminExtractionSessions'))

export const Route = createFileRoute('/admin/extraction-sessions/$sessionId')({
  parseParams: (params) => ({
    sessionId: z.string().optional().parse(params.sessionId),
  }),
  component: AdminExtractionSessions,
})