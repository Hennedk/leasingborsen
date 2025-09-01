import { useNavigate, useSearch } from '@tanstack/react-router'
import { useMemo, useCallback, useRef, useEffect } from 'react'

// Moved to src/types/index.ts for shared usage

import type { LeaseConfigState } from '@/types'
import { LEASE_DEFAULTS, clampLeaseValue } from '@/lib/leaseConfigMapping'

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

type UseLeaseConfigUrlSyncOptions = {
  debounceMs?: number
  onClamp?: (key: keyof LeaseConfigState, from: number, to: number) => void
  onError?: (err: unknown) => void
}

export function useLeaseConfigUrlSync(options: UseLeaseConfigUrlSyncOptions = {}): [LeaseConfigState, (key: keyof LeaseConfigState, value: number | null) => void] {
  const navigate = useNavigate({ from: '/listings' })
  const search = useSearch({ from: '/listings' })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { debounceMs = 0, onClamp, onError } = options

  const config = useMemo(() => ({
    km: Number(search.km) || LEASE_DEFAULTS.mileage, // Use centralized default
    mdr: Number(search.mdr) || LEASE_DEFAULTS.term,
    udb: Number(search.udb) || LEASE_DEFAULTS.deposit
  }), [search])
  
  // Debounced, validated update of km/mdr/udb in the URL
  const updateConfig = useCallback((key: keyof LeaseConfigState, value: number | null) => {
    const perform = () => {
      try {
        if (value === null) {
          // Remove key from URL
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [key]: _removed, ...cleanSearch } = search
          navigate({ search: cleanSearch, replace: true })
          return
        }

        // Map legacy key to clamp domain
        const mapKey = (k: keyof LeaseConfigState) => (k === 'km' ? 'mileage' : k === 'mdr' ? 'term' : 'deposit') as 'mileage' | 'term' | 'deposit'
        const clamped = clampLeaseValue(mapKey(key), value)
        if (clamped !== value) {
          onClamp?.(key, value, clamped)
        }

        navigate({ 
          search: { 
            ...search, 
            [key]: clamped 
          },
          replace: true 
        })
      } catch (err) {
        onError?.(err)
        if (!onError) {
          console.error('Lease config URL update failed:', err)
        }
      }
    }

    if (debounceMs > 0) {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      timerRef.current = setTimeout(perform, debounceMs)
    } else {
      perform()
    }
  }, [debounceMs, navigate, onClamp, onError, search])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])
  
  return [config, updateConfig]
}
