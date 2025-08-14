import React, { useState } from 'react'

// Debug component to show environment info - only in development/preview
export const DebugInfo: React.FC = () => {
  const [isMinimized, setIsMinimized] = useState(true)
  
  // Check if we're on production domain
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    const isProduction = hostname === 'leasingborsen-react-production-henrik-thomsens-projects.vercel.app' ||
                        hostname === 'leasingborsen-react-production.vercel.app' ||
                        hostname === 'leasingborsen.dk' ||
                        hostname === 'www.leasingborsen.dk'
    
    // Never show debug info on production domains
    if (isProduction) {
      return null
    }
  }
  
  // Also hide if VERCEL_ENV is explicitly set to production
  if (import.meta.env.VERCEL_ENV === 'production') {
    return null
  }

  const isStaging = import.meta.env.VITE_SUPABASE_URL?.includes('lpbtgtpgbnybjqcpsrrf')

  // Minimized view - just a small indicator
  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 bg-black/90 text-white px-3 py-2 rounded-lg text-xs font-mono z-50 border border-orange-400 hover:bg-black/95 transition-colors"
        title="Click to expand debug info"
      >
        🔧 {isStaging ? 'STAGING' : 'DEV'}
      </button>
    )
  }

  // Expanded view
  return (
    <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg text-sm font-mono max-w-sm z-50 border border-orange-400">
      <div className="flex items-center justify-between mb-2">
        <div className="font-bold text-orange-300">🔧 Staging Debug Info</div>
        <button 
          onClick={() => setIsMinimized(true)}
          className="text-orange-300 hover:text-orange-100 text-lg leading-none"
          title="Minimize"
        >
          ×
        </button>
      </div>
      <div>NODE_ENV: {import.meta.env.MODE}</div>
      <div>VERCEL_ENV: {import.meta.env.VERCEL_ENV || 'undefined'}</div>
      <div>SUPABASE_URL: {import.meta.env.VITE_SUPABASE_URL ? 
        (isStaging ? '✅ STAGING' : '⚠️ PRODUCTION') : 
        '❌ Missing'}</div>
      <div>SUPABASE_KEY: {import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</div>
      <div>Hostname: {typeof window !== 'undefined' ? window.location.hostname : 'SSR'}</div>
    </div>
  )
}