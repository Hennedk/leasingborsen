import { useNavigate, useSearch } from '@tanstack/react-router'
import { useMemo, useCallback, useRef, useEffect } from 'react'

// Moved to src/types/index.ts for shared usage

import type { LeaseConfigState } from '@/types'
import { LEASE_DEFAULTS, normalizeLeaseParams, validateLeaseConfig, mapToLegacyParams } from '@/lib/leaseConfigMapping'

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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const config = useMemo(() => ({
    km: Number(search.km) || LEASE_DEFAULTS.mileage, // Use centralized default
    mdr: Number(search.mdr) || LEASE_DEFAULTS.term,
    udb: Number(search.udb) || LEASE_DEFAULTS.deposit
  }), [search])
  
  // Debounced, validated update of km/mdr/udb in the URL
  const updateConfig = useCallback((key: keyof LeaseConfigState, value: number | null) => {
    // Clear pending update
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    timerRef.current = setTimeout(() => {
      try {
        if (value === null) {
          // Remove key from URL
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [key]: _removed, ...cleanSearch } = search
          navigate({ search: cleanSearch, replace: true })
          return
        }

        // Build internal config from current URL + requested change
        const internal = normalizeLeaseParams(search as unknown as Record<string, unknown>, true)

        if (key === 'km') internal.selectedMileage = value
        if (key === 'mdr') internal.selectedTerm = value
        if (key === 'udb') internal.selectedDeposit = value

        // Clamp values to valid ranges
        const validated = validateLeaseConfig(internal, false)

        // Map back to legacy params for listings route
        const legacy = mapToLegacyParams(validated)

        navigate({ 
          search: { 
            ...search, 
            km: legacy.km, 
            mdr: legacy.mdr, 
            udb: legacy.udb 
          },
          replace: true 
        })
      } catch (err) {
        // Fallback: do nothing on validation error in non-strict mode
        console.error('Lease config URL update failed:', err)
      }
    }, 200)
  }, [navigate, search])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])
  
  return [config, updateConfig]
}
