import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useLeaseCalculator } from '../src/hooks/useLeaseCalculator'

const makeCar = (overrides: Partial<any> = {}) => ({
  id: 'listing-test',
  listing_id: 'listing-test',
  selected_mileage: 15000,
  selected_term: 36,
  selected_deposit: 30000,
  lease_pricing: [],
  ...overrides,
})

const offers = [
  { mileage_per_year: 15000, period_months: 36, first_payment: 15000, monthly_price: 4100 },
  { mileage_per_year: 15000, period_months: 36, first_payment: 30000, monthly_price: 4000 },
  { mileage_per_year: 15000, period_months: 36, first_payment: 45000, monthly_price: 3900 },
]

vi.mock('../src/hooks/useOffers', () => ({
  useOffers: () => ({ data: offers, isLoading: false, error: null })
}))

describe('useLeaseCalculator fallback behaviour', () => {
  it('prioritises deposit closest to requested amount when exact match missing', () => {
    const car = makeCar({ selected_deposit: 30000 })
    const { result } = renderHook(() => useLeaseCalculator(car as any))

    expect(result.current.selectedUpfront).toBe(30000)
  })

  it('falls back to closest deposit when URL requests unavailable amount', () => {
    const car = makeCar({ selected_deposit: undefined, first_payment: 0 })
    const { result } = renderHook(() => useLeaseCalculator({
      ...car,
      selected_deposit: undefined,
      first_payment: 0,
    } as any))

    expect(result.current.selectedUpfront).toBe(15000)
  })
})
