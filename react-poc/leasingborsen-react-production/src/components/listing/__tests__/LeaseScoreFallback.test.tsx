import { render, screen } from '@testing-library/react'
import type { CarListing } from '@/types'
import ListingImage from '../ListingImage'
import LeaseCalculatorCard from '../LeaseCalculatorCard'

describe('Detail components - LeaseScore fallback order', () => {
  const baseCar: CarListing = {
    id: 'car-1',
    make: 'VW',
    model: 'ID.4',
    body_type: 'SUV',
    fuel_type: 'Electric',
    transmission: 'Automatic',
    retail_price: 300000,
  }

  describe('ListingImage', () => {
    it('prefers selectedLeaseScore over selected_lease_score and lease_score', () => {
      const car: CarListing = {
        ...baseCar,
        selected_lease_score: 80,
        lease_score: 70,
      }
      render(<ListingImage car={car} selectedLeaseScore={91} />)
      expect(screen.getByRole('img', { name: /LeaseScore: 91/ })).toBeInTheDocument()
    })

    it('falls back to car.selected_lease_score when selectedLeaseScore is undefined', () => {
      const car: CarListing = {
        ...baseCar,
        selected_lease_score: 82,
        lease_score: 73,
      }
      render(<ListingImage car={car} />)
      expect(screen.getByRole('img', { name: /LeaseScore: 82/ })).toBeInTheDocument()
    })

    it('falls back to car.lease_score when others are undefined', () => {
      const car: CarListing = {
        ...baseCar,
        lease_score: 75,
      }
      render(<ListingImage car={car} />)
      expect(screen.getByRole('img', { name: /LeaseScore: 75/ })).toBeInTheDocument()
    })
  })

  describe('LeaseCalculatorCard', () => {
    const commonProps = {
      selectedLease: undefined,
      selectedLeaseScore: undefined as number | undefined,
      selectedMileage: 15000,
      selectedPeriod: 36,
      selectedUpfront: 0,
      availableMileages: [10000, 15000, 20000],
      availablePeriods: [24, 36, 48],
      availableUpfronts: [0, 35000],
      onMileageChange: () => {},
      onPeriodChange: () => {},
      onUpfrontChange: () => {},
      onShowSeller: () => {},
      initStatus: 'initialized' as const,
    }

    it('prefers selectedLeaseScore', () => {
      const car: CarListing = { ...baseCar, selected_lease_score: 80, lease_score: 70 }
      render(
        <LeaseCalculatorCard
          car={car}
          {...commonProps}
          selectedLeaseScore={92}
        />
      )
      expect(screen.getByRole('img', { name: /LeaseScore: 92/ })).toBeInTheDocument()
    })

    it('falls back to car.selected_lease_score', () => {
      const car: CarListing = { ...baseCar, selected_lease_score: 83, lease_score: 71 }
      render(
        <LeaseCalculatorCard
          car={car}
          {...commonProps}
        />
      )
      expect(screen.getByRole('img', { name: /LeaseScore: 83/ })).toBeInTheDocument()
    })

    it('falls back to car.lease_score', () => {
      const car: CarListing = { ...baseCar, lease_score: 74 }
      render(
        <LeaseCalculatorCard
          car={car}
          {...commonProps}
        />
      )
      expect(screen.getByRole('img', { name: /LeaseScore: 74/ })).toBeInTheDocument()
    })
  })
})

