import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  storePreferredLeaseConfig,
  consumePreferredLeaseConfig,
  clearPreferredLeaseConfig,
  PREFERRED_LEASE_CONFIG_TTL_MS,
} from '../leaseConfigPreference'

const STORAGE_PREFIX = 'leasingborsen:preferred-lease-config:'

describe('leaseConfigPreference', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.useRealTimers()
  })

  afterEach(() => {
    sessionStorage.clear()
    vi.useRealTimers()
  })

  it('stores and consumes filtered lease configuration data', () => {
    storePreferredLeaseConfig('listing-123', {
      selectedDeposit: 30000,
      selectedMileage: 20000,
      selectedTerm: undefined,
    })

    const storedKeys = Object.keys(sessionStorage)
    expect(storedKeys).toContain(`${STORAGE_PREFIX}listing-123`)

    const consumed = consumePreferredLeaseConfig('listing-123')
    expect(consumed).toEqual({
      selectedDeposit: 30000,
      selectedMileage: 20000,
    })

    expect(sessionStorage.getItem(`${STORAGE_PREFIX}listing-123`)).toBeNull()
  })

  it('returns null when nothing was stored', () => {
    expect(consumePreferredLeaseConfig('missing')).toBeNull()
  })

  it('drops entries when values are undefined', () => {
    storePreferredLeaseConfig('listing-empty', {
      selectedDeposit: undefined,
      selectedMileage: undefined,
    })

    expect(sessionStorage.getItem(`${STORAGE_PREFIX}listing-empty`)).toBeNull()
  })

  it('expires entries after the TTL', () => {
    vi.useFakeTimers()

    storePreferredLeaseConfig('listing-ttl', { selectedDeposit: 15000 })
    vi.advanceTimersByTime(PREFERRED_LEASE_CONFIG_TTL_MS + 1000)

    expect(consumePreferredLeaseConfig('listing-ttl')).toBeNull()
  })

  it('clears entries explicitly', () => {
    storePreferredLeaseConfig('listing-clear', { selectedDeposit: 10000 })
    clearPreferredLeaseConfig('listing-clear')

    expect(sessionStorage.getItem(`${STORAGE_PREFIX}listing-clear`)).toBeNull()
  })
})
