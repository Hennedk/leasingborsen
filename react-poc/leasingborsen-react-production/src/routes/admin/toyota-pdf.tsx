import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'

const ToyotaPDFProcessingPage = lazy(() => import('@/pages/admin/ToyotaPDFProcessingPage'))

export const Route = createFileRoute('/admin/toyota-pdf')({
  component: ToyotaPDFProcessingPage,
})