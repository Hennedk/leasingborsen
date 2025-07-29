import React from 'react'

// Debug component to show environment info - only in development/preview
export const DebugInfo: React.FC = () => {
  // Only show in non-production
  if (import.meta.env.PROD && import.meta.env.VERCEL_ENV === 'production') {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg text-sm font-mono max-w-sm z-50 border border-orange-400">
      <div className="font-bold mb-2 text-orange-300">🔧 Staging Debug Info:</div>
      <div>NODE_ENV: {import.meta.env.MODE}</div>
      <div>VERCEL_ENV: {import.meta.env.VERCEL_ENV || 'undefined'}</div>
      <div>SUPABASE_URL: {import.meta.env.VITE_SUPABASE_URL ? 
        (import.meta.env.VITE_SUPABASE_URL.includes('lpbtgtpgbnybjqcpsrrf') ? '✅ STAGING' : '⚠️ PRODUCTION') : 
        '❌ Missing'}</div>
      <div>SUPABASE_KEY: {import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</div>
      <div>Hostname: {typeof window !== 'undefined' ? window.location.hostname : 'SSR'}</div>
    </div>
  )
}