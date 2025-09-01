import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import type { CarListing } from '@/types'

// Mock image lazy loading to avoid side effects (declare before importing component)
vi.mock('@/hooks/useImageLazyLoading', () => ({
  useImageLazyLoading: () => ({
    imageRef: { current: null },
    imageLoaded: true,
    imageError: false,
    retryImage: vi.fn(),
    canRetry: true,
  }),
}))

// Mock navigation context to avoid relying on router/session
vi.mock('@/hooks/useNavigationContext', () => ({
  useNavigationContext: () => ({
    prepareListingNavigation: vi.fn(),
    getNavigationInfo: vi.fn(),
    smartBack: vi.fn(),
    getCurrentState: vi.fn(),
  }),
}))

// Capture navigate calls from TanStack Router
const navigateFn = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useSearch: vi.fn(() => ({})), // No URL km/mdr/udb present
  useNavigate: vi.fn(() => navigateFn),
  useLocation: vi.fn(() => ({ pathname: '/listings' })),
}))

import ListingCard from '../ListingCard'

const baseCar: CarListing = {
  id: 'car-1',
  listing_id: 'car-1',
  make: 'VW',
  model: 'ID.4',
  variant: 'Pro',
  fuel_type: 'Electric',
  transmission: 'Automatic',
  body_type: 'SUV',
  monthly_price: 3999,
  retail_price: 299999,
  horsepower: 204,
  seats: 5,
  doors: 5,
  seller_id: 's-1',
  seller_name: 'Dealer',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
}

describe('ListingCard navigation carries selected offer', () => {
  beforeEach(() => {
    navigateFn.mockClear()
  })

  it('forwards card selected_mileage/term/deposit to listing detail when URL has no overrides', () => {
    const car = {
      ...baseCar,
      selected_mileage: 20000,
      selected_term: 36,
      selected_deposit: 0,
    }

    render(<ListingCard car={car} />)

    // Click the card (role="link")
    fireEvent.click(screen.getByRole('link'))

    // Assert navigate was called with selectedX reflecting the card's selection
    expect(navigateFn).toHaveBeenCalled()
    const callArg = navigateFn.mock.calls.at(-1)?.[0]
    expect(callArg).toBeTruthy()
    expect(callArg.to).toBe('/listing/$id')
    expect(callArg.params).toEqual({ id: 'car-1' })
    expect(callArg.search).toMatchObject({
      selectedMileage: 20000,
      selectedTerm: 36,
      selectedDeposit: 0,
    })
  })
})
