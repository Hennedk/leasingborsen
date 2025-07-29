import React from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info } from 'lucide-react'

// Detect if running in Vercel preview environment
const isPreviewEnvironment = () => {
  if (typeof window === 'undefined') return false
  
  return (
    // Vercel preview URLs contain 'git-' in hostname
    window.location.hostname.includes('-git-') ||
    window.location.hostname.includes('git-') ||
    // Or check for Vercel environment variable
    import.meta.env.VERCEL_ENV === 'preview'
  )
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