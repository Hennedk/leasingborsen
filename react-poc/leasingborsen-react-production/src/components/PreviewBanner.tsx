import React from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info } from 'lucide-react'

// Detect if running in Vercel preview environment
const isPreviewEnvironment = () => {
  // Check Vercel environment variable first
  if (import.meta.env.VERCEL_ENV === 'preview') return true
  
  // Browser-based detection for client-side
  if (typeof window !== 'undefined') {
    return (
      // Vercel preview URLs contain 'git-' in hostname
      window.location.hostname.includes('-git-') ||
      window.location.hostname.includes('git-') ||
      // Or staging subdomain
      window.location.hostname.includes('staging') ||
      // Or random hash pattern (preview deployments)
      /leasingborsen-react-production-[a-z0-9]+\.vercel\.app/.test(window.location.hostname)
    )
  }
  
  return false
}

export const PreviewBanner: React.FC = () => {
  // Only show in preview environment
  if (!isPreviewEnvironment()) {
    return null
  }

  return (
    <Alert className="border-orange-200 bg-orange-50 text-orange-800 rounded-none">
      <Info className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-center text-sm font-medium">
        🚧 Preview Environment - Using Staging Database - Changes won't affect production
      </AlertDescription>
    </Alert>
  )
}

// Export detection function for use elsewhere
export { isPreviewEnvironment }