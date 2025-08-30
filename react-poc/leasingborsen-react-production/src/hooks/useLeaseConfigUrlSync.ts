import { useNavigate, useSearch } from '@tanstack/react-router'
import { useMemo, useCallback } from 'react'

// Moved to src/types/index.ts for shared usage

import type { LeaseConfigState } from '@/types'

/**
 * Synchronizes lease configuration with URL search parameters
 * 
 * Manages the km/mdr/udb URL parameters that control:
 * - km: Mileage per year (nullable - uses listing default if not set)
 * - mdr: Term in months (defaults to 36)
 * - udb: Upfront deposit/payment (defaults to 0)
 * 
 * Used by MobilePriceBar to update URL when user changes config.
 * Read by ListingCard to ensure navigation carries current config.
 * 
 * @returns [config, updateConfig] - Current config and setter function
 */

export function useLeaseConfigUrlSync(): [LeaseConfigState, (key: keyof LeaseConfigState, value: number | null) => void] {
  const navigate = useNavigate({ from: '/listings' })
  const search = useSearch({ from: '/listings' })
  
  const config = useMemo(() => ({
    km: search.km ? Number(search.km) : null,
    mdr: Number(search.mdr) || 36,
    udb: Number(search.udb) || 0
  }), [search])
  
  const updateConfig = useCallback((key: keyof LeaseConfigState, value: number | null) => {
    if (value === null) {
      const { [key]: _, ...cleanSearch } = search
      navigate({ 
        search: cleanSearch,
        replace: true 
      })
    } else {
      navigate({ 
        search: { ...search, [key]: value },
        replace: true 
      })
    }
  }, [navigate, search])
  
  return [config, updateConfig]
}