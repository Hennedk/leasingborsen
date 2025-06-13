import { useState, useEffect, useMemo } from 'react'
import type { CarListing } from '@/types'

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
}

export const useLeaseCalculator = (car: CarListing | undefined): LeaseCalculatorData => {
  const [selectedMileage, setSelectedMileage] = useState<number | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null)
  const [selectedUpfront, setSelectedUpfront] = useState<number | null>(null)

  // Mock lease options - in real implementation, this would come from API
  const leaseOptions = useMemo(() => {
    if (!car?.monthly_price) return []
    
    return [
      { mileage_per_year: 10000, period_months: 36, first_payment: 0, monthly_price: car.monthly_price },
      { mileage_per_year: 15000, period_months: 36, first_payment: 0, monthly_price: car.monthly_price + 200 },
      { mileage_per_year: 20000, period_months: 36, first_payment: 0, monthly_price: car.monthly_price + 400 },
      { mileage_per_year: 10000, period_months: 48, first_payment: 0, monthly_price: car.monthly_price - 150 },
      { mileage_per_year: 15000, period_months: 48, first_payment: 0, monthly_price: car.monthly_price + 50 },
      { mileage_per_year: 20000, period_months: 48, first_payment: 0, monthly_price: car.monthly_price + 250 },
      { mileage_per_year: 10000, period_months: 36, first_payment: 50000, monthly_price: car.monthly_price - 300 },
      { mileage_per_year: 15000, period_months: 36, first_payment: 50000, monthly_price: car.monthly_price - 100 },
    ]
  }, [car?.monthly_price])

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
    resetToCheapest
  }
}