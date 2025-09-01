import { useNavigate, useSearch } from '@tanstack/react-router'
import { useMemo, useCallback } from 'react'

// Moved to src/types/index.ts for shared usage

import type { LeaseConfigState } from '@/types'
import { LEASE_DEFAULTS } from '@/lib/leaseConfigMapping'

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
    km: Number(search.km) || LEASE_DEFAULTS.mileage, // Use centralized default
    mdr: Number(search.mdr) || LEASE_DEFAULTS.term,
    udb: Number(search.udb) || LEASE_DEFAULTS.deposit
  }), [search])
  
  const updateConfig = useCallback((key: keyof LeaseConfigState, value: number | null) => {
    if (value === null) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [key]: removedKey, ...cleanSearch } = search
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