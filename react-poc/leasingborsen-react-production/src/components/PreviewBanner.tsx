import React from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info } from 'lucide-react'

// Detect if running in Vercel preview environment
const isPreviewEnvironment = () => {
  // Check Vercel environment variable first
  if (import.meta.env.VERCEL_ENV === 'preview') return true
  
  // Browser-based detection for client-side
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    
    // Explicitly check if we're on the production domain
    const isProduction = hostname === 'leasingborsen-react-production-henrik-thomsens-projects.vercel.app' ||
                        hostname === 'leasingborsen-react-production.vercel.app' ||
                        hostname === 'leasingborsen.dk' ||
                        hostname === 'www.leasingborsen.dk'
    
    // If we're on production, never show the preview banner
    if (isProduction) {
      return false
    }
    
    return (
      // Vercel preview URLs contain 'git-' in hostname
      hostname.includes('-git-') ||
      hostname.includes('git-') ||
      // Or staging subdomain
      hostname.includes('staging') ||
      // Any Vercel app that's not production
      hostname.includes('vercel.app') ||
      // Or if we're using staging Supabase URL (definitive check)
      (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL.includes('lpbtgtpgbnybjqcpsrrf'))
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
    <Alert className="border-orange-400 bg-orange-100 text-orange-900 rounded-none border-2">
      <Info className="h-5 w-5 text-orange-600" />
      <AlertDescription className="flex items-center justify-center text-base font-bold">
        🚧 STAGING ENVIRONMENT - Using Staging Database - Safe for Testing - No Production Impact 🚧
      </AlertDescription>
    </Alert>
  )
}

// Export detection function for use elsewhere
export { isPreviewEnvironment }