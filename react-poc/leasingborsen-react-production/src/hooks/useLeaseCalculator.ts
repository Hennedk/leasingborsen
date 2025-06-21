import { useState, useEffect, useMemo } from 'react'
import type { CarListing } from '@/types'
import { useOffers } from './useOffers'

export interface LeaseOption {
  mileage_per_year: number
  period_months: number
  first_payment: number
  monthly_price: number
}

export interface LeaseCalculatorData {
  selectedMileage: number | null
  selectedPeriod: number | null
  selectedUpfront: number | null
  selectedLease: LeaseOption | undefined
  availableMileages: number[]
  availablePeriods: number[]
  availableUpfronts: number[]
  leaseOptions: LeaseOption[]
  setSelectedMileage: (value: number) => void
  setSelectedPeriod: (value: number) => void
  setSelectedUpfront: (value: number) => void
  resetToCheapest: () => void
  isLoading: boolean
  error: any
}

export const useLeaseCalculator = (car: CarListing | undefined): LeaseCalculatorData => {
  const [selectedMileage, setSelectedMileage] = useState<number | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null)
  const [selectedUpfront, setSelectedUpfront] = useState<number | null>(null)

  // Fetch real pricing data from database instead of using mock data
  const { data: offers, isLoading, error } = useOffers(car?.listing_id || '')

  // Convert offers to lease options format
  const leaseOptions = useMemo(() => {
    if (!offers || offers.length === 0) return []
    
    return offers.map(offer => ({
      mileage_per_year: offer.mileage_per_year || 0,
      period_months: offer.period_months || 0,
      first_payment: offer.first_payment || 0,
      monthly_price: offer.monthly_price
    })).filter(option => 
      // Filter out options with missing required data
      option.mileage_per_year > 0 && 
      option.period_months > 0 && 
      option.monthly_price > 0
    )
  }, [offers])

  // Derived options
  const availableMileages = useMemo(() => 
    [...new Set(leaseOptions.map(o => o.mileage_per_year))].sort((a, b) => a - b),
    [leaseOptions]
  )
  
  const availablePeriods = useMemo(() => 
    [...new Set(leaseOptions.map(o => o.period_months))].sort((a, b) => a - b),
    [leaseOptions]
  )
  
  const availableUpfronts = useMemo(() => 
    [...new Set(leaseOptions.map(o => o.first_payment))].sort((a, b) => a - b),
    [leaseOptions]
  )

  // Selected lease option
  const selectedLease = useMemo(() => 
    leaseOptions.find(o =>
      o.mileage_per_year === selectedMileage &&
      o.period_months === selectedPeriod &&
      o.first_payment === selectedUpfront
    ),
    [leaseOptions, selectedMileage, selectedPeriod, selectedUpfront]
  )

  // Reset to cheapest option
  const resetToCheapest = () => {
    if (leaseOptions.length === 0) return
    
    const cheapest = leaseOptions.reduce((prev, curr) => 
      prev.monthly_price < curr.monthly_price ? prev : curr
    )
    
    setSelectedMileage(cheapest.mileage_per_year)
    setSelectedPeriod(cheapest.period_months)
    setSelectedUpfront(cheapest.first_payment)
  }

  // Initialize with cheapest option
  useEffect(() => {
    if (leaseOptions.length && !selectedLease) {
      resetToCheapest()
    }
  }, [leaseOptions, selectedLease])

  return {
    selectedMileage,
    selectedPeriod,
    selectedUpfront,
    selectedLease,
    availableMileages,
    availablePeriods,
    availableUpfronts,
    leaseOptions,
    setSelectedMileage,
    setSelectedPeriod,
    setSelectedUpfront,
    resetToCheapest,
    isLoading,
    error
  }
}