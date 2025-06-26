import React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Database, Trash2 } from 'lucide-react'
import { cacheUtils } from '@/lib/cacheUtils'

/**
 * Development component for invalidating React Query cache
 * Only use this in development mode to fix cache issues
 */
export const CacheInvalidator: React.FC = () => {
  const queryClient = useQueryClient()
  
  const invalidateReferenceData = async () => {
    try {
      console.log('🔄 Invalidating reference data cache...')
      await cacheUtils.invalidateReferenceData(queryClient)
      console.log('✅ Reference data cache invalidated!')
      
      // Show a visual confirmation
      const btn = document.getElementById('invalidate-ref-btn')
      if (btn) {
        btn.textContent = '✅ Cache Invalidated!'
        setTimeout(() => {
          btn.textContent = 'Invalidate Reference Data'
        }, 2000)
      }
    } catch (error) {
      console.error('❌ Error invalidating cache:', error)
    }
  }
  
  const refetchReferenceData = async () => {
    try {
      console.log('🔄 Refetching reference data...')
      await cacheUtils.refetchReferenceData(queryClient)
      console.log('✅ Reference data refetched!')
      
      // Show a visual confirmation
      const btn = document.getElementById('refetch-ref-btn')
      if (btn) {
        btn.textContent = '✅ Data Refetched!'
        setTimeout(() => {
          btn.textContent = 'Refetch Reference Data'
        }, 2000)
      }
    } catch (error) {
      console.error('❌ Error refetching data:', error)
    }
  }
  
  const clearAllCache = async () => {
    try {
      console.log('🔄 Clearing all cache...')
      cacheUtils.clearAllCache(queryClient)
      console.log('✅ All cache cleared!')
      
      // Show a visual confirmation
      const btn = document.getElementById('clear-all-btn')
      if (btn) {
        btn.textContent = '✅ Cache Cleared!'
        setTimeout(() => {
          btn.textContent = 'Clear All Cache'
        }, 2000)
      }
    } catch (error) {
      console.error('❌ Error clearing cache:', error)
    }
  }
  
  // Get current cache status
  const cacheStatus = cacheUtils.isReferenceDataCached(queryClient)
  
  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return null
  }
  
  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-800">
          <Database className="h-5 w-5" />
          Development Cache Controller
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-yellow-700">
          <p className="mb-2">Current cache status:</p>
          <div className="flex gap-2 mb-3">
            <Badge variant={cacheStatus.referenceData ? "default" : "secondary"}>
              Reference Data: {cacheStatus.referenceData ? 'Cached' : 'Not Cached'}
            </Badge>
            <Badge variant={cacheStatus.models ? "default" : "secondary"}>
              Models: {cacheStatus.models ? 'Cached' : 'Not Cached'}
            </Badge>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button 
            id="invalidate-ref-btn"
            onClick={invalidateReferenceData}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Invalidate Reference Data
          </Button>
          
          <Button 
            id="refetch-ref-btn"
            onClick={refetchReferenceData}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refetch Reference Data
          </Button>
          
          <Button 
            id="clear-all-btn"
            onClick={clearAllCache}
            variant="destructive"
            size="sm"
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Clear All Cache
          </Button>
        </div>
        
        <div className="text-xs text-yellow-600 bg-yellow-100 p-2 rounded">
          <strong>Usage:</strong> If new reference data (makes/models) aren't showing up in the batch import, 
          click "Invalidate Reference Data" to force a refresh. This will make the application refetch 
          the latest data from the database.
        </div>
      </CardContent>
    </Card>
  )
}

export default CacheInvalidator