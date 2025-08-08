import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import ListingCard from '../ListingCard'
import type { CarListing } from '@/types'

// Mock the lazy loading hook
vi.mock('@/hooks/useImageLazyLoading', () => ({
  useImageLazyLoading: () => ({
    imageRef: { current: null },
    imageLoaded: true,
    imageError: false,
    retryImage: vi.fn(),
    canRetry: true
  })
}))

const mockCarWithScore: CarListing = {
  id: 'test-car-1',
  listing_id: 'test-listing-1',
  make: 'BMW',
  model: 'X3',
  variant: '2.0d xDrive',
  year: 2024,
  monthly_price: 5000,
  retail_price: 450000,
  lease_score: 85,
  lease_score_calculated_at: '2025-01-01T00:00:00Z',
  lease_score_breakdown: {
    totalScore: 85,
    monthlyRateScore: 90,
    monthlyRatePercent: 1.11,
    mileageScore: 75,
    mileageNormalized: 1.0,
    flexibilityScore: 85,
    pricing_id: 'pricing-1',
    calculation_version: '1.0'
  },
  fuel_type: 'Diesel',
  transmission: 'Automatic',
  body_type: 'SUV',
  horsepower: 190,
  seats: 5,
  doors: 5,
  image: 'https://example.com/image.jpg',
  seller_id: 'seller-1',
  seller_name: 'Test Dealer',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z'
}

const mockCarWithoutScore: CarListing = {
  ...mockCarWithScore,
  id: 'test-car-2',
  lease_score: undefined,
  lease_score_breakdown: undefined,
  retail_price: undefined
}

const mockCarWithLowScore: CarListing = {
  ...mockCarWithScore,
  id: 'test-car-3',
  lease_score: 45
}

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

describe('ListingCard - Lease Score Integration', () => {
  it('should display LeaseScorePill when score >= 60 and retail_price exists', () => {
    renderWithRouter(<ListingCard car={mockCarWithScore} />)
    
    expect(screen.getByRole('img', { name: /LeaseScore: 85/ })).toBeInTheDocument()
    expect(screen.getByText('LeaseScore')).toBeInTheDocument()
    expect(screen.getByText('Fantastisk værdi')).toBeInTheDocument()
    expect(screen.getByText('85')).toBeInTheDocument()
  })

  it('should not display LeaseScorePill when score is undefined', () => {
    renderWithRouter(<ListingCard car={mockCarWithoutScore} />)
    
    expect(screen.queryByText('LeaseScore')).not.toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /LeaseScore/ })).not.toBeInTheDocument()
  })

  it('should not display LeaseScorePill when score < 60', () => {
    renderWithRouter(<ListingCard car={mockCarWithLowScore} />)
    
    expect(screen.queryByText('LeaseScore')).not.toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /LeaseScore/ })).not.toBeInTheDocument()
  })

  it('should position pill absolutely in top-right corner of image container', () => {
    renderWithRouter(<ListingCard car={mockCarWithScore} />)
    
    const pill = screen.getByRole('img', { name: /LeaseScore: 85/ })
    expect(pill).toHaveClass('absolute', 'top-4', 'right-4', 'z-10')
  })

  it('should maintain pill visibility during card hover interactions', () => {
    renderWithRouter(<ListingCard car={mockCarWithScore} />)
    
    const cardLink = screen.getByRole('link')
    const pill = screen.getByRole('img', { name: /LeaseScore: 85/ })
    
    // Hover over card
    fireEvent.mouseEnter(cardLink)
    expect(pill).toBeInTheDocument()
    expect(pill).toBeVisible()
    
    // Leave hover
    fireEvent.mouseLeave(cardLink)
    expect(pill).toBeInTheDocument()
    expect(pill).toBeVisible()
  })

  it('should work with different image states (loading, error, no image)', () => {
    // Test with no image
    const carWithoutImage = { ...mockCarWithScore, image: undefined }
    const { rerender } = renderWithRouter(<ListingCard car={carWithoutImage} />)
    
    expect(screen.getByRole('img', { name: /LeaseScore: 85/ })).toBeInTheDocument()
    
    // Test with different image
    const carWithDifferentImage = { ...mockCarWithScore, image: 'https://example.com/other.jpg' }
    rerender(
      <BrowserRouter>
        <ListingCard car={carWithDifferentImage} />
      </BrowserRouter>
    )
    
    expect(screen.getByRole('img', { name: /LeaseScore: 85/ })).toBeInTheDocument()
  })

  it('should use small size for card display', () => {
    renderWithRouter(<ListingCard car={mockCarWithScore} />)
    
    const pill = screen.getByRole('img', { name: /LeaseScore: 85/ })
    expect(pill).toHaveClass('px-3', 'py-1') // Small size classes
  })

  it('should handle car object with only listing_id (no id field)', () => {
    const carWithOnlyListingId = { 
      ...mockCarWithScore, 
      id: undefined,
      listing_id: 'test-listing-only' 
    }
    
    renderWithRouter(<ListingCard car={carWithOnlyListingId} />)
    
    expect(screen.getByRole('img', { name: /LeaseScore: 85/ })).toBeInTheDocument()
  })

  it('should not crash when car object is null or undefined', () => {
    const { rerender } = renderWithRouter(<ListingCard car={null} />)
    expect(screen.queryByRole('img', { name: /LeaseScore/ })).not.toBeInTheDocument()
    
    rerender(
      <BrowserRouter>
        <ListingCard car={undefined} />
      </BrowserRouter>
    )
    expect(screen.queryByRole('img', { name: /LeaseScore/ })).not.toBeInTheDocument()
  })

  it('should handle loading state gracefully (no pill during loading)', () => {
    renderWithRouter(<ListingCard car={mockCarWithScore} loading={true} />)
    
    expect(screen.queryByRole('img', { name: /LeaseScore/ })).not.toBeInTheDocument()
    expect(screen.queryByText('LeaseScore')).not.toBeInTheDocument()
  })
})