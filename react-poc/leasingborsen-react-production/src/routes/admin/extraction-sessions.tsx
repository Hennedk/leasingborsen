import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'

const AdminExtractionSessions = lazy(() => import('@/pages/admin/AdminExtractionSessions'))

export const Route = createFileRoute('/admin/extraction-sessions')({
  component: AdminExtractionSessions,
})