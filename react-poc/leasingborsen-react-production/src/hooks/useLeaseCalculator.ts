import { useState, useEffect, useMemo } from 'react'
import type { CarListing } from '@/types'
import type { HoveredOption, PriceImpactData } from '@/types/priceImpact'
import { useOffers } from './useOffers'
import { PriceMatrix } from '@/lib/priceMatrix'
// import { useLeaseCalculatorDebug } from './useLeaseCalculatorDebug' // Uncomment for debugging

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
  totalCost: number | null
  cheapestOption: LeaseOption | undefined
  isCheapest: boolean
  priceDifference: number
  priceMatrix: PriceMatrix | null
  mileagePriceImpacts: Map<number, PriceImpactData>
  periodPriceImpacts: Map<number, PriceImpactData>
  upfrontPriceImpacts: Map<number, PriceImpactData>
  setHoveredOption: (option: HoveredOption | null) => void
  hoveredPriceImpact: PriceImpactData | null
}

export const useLeaseCalculator = (car: CarListing | undefined): LeaseCalculatorData => {
  const [selectedMileage, setSelectedMileage] = useState<number | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null)
  const [selectedUpfront, setSelectedUpfront] = useState<number | null>(null)
  const [hoveredOption, setHoveredOption] = useState<HoveredOption | null>(null)

  // Fetch real pricing data from database instead of using mock data
  // Use both possible ID fields for compatibility with different data sources
  const listingId = car?.listing_id || car?.id || ''
  const { data: offers, isLoading, error } = useOffers(listingId)

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

  // Find cheapest option
  const cheapestOption = useMemo(() => {
    if (leaseOptions.length === 0) return undefined
    return leaseOptions.reduce((prev, curr) => 
      prev.monthly_price < curr.monthly_price ? prev : curr
    )
  }, [leaseOptions])

  // Calculate total cost
  const totalCost = useMemo(() => {
    if (!selectedLease) return null
    return (selectedLease.monthly_price * selectedLease.period_months) + selectedLease.first_payment
  }, [selectedLease])

  // Check if current selection is cheapest
  const isCheapest = useMemo(() => {
    if (!selectedLease || !cheapestOption) return false
    return selectedLease.monthly_price === cheapestOption.monthly_price
  }, [selectedLease, cheapestOption])

  // Calculate price difference from cheapest
  const priceDifference = useMemo(() => {
    if (!selectedLease || !cheapestOption) return 0
    return selectedLease.monthly_price - cheapestOption.monthly_price
  }, [selectedLease, cheapestOption])

  // Create price matrix for efficient lookups
  const priceMatrix = useMemo(() => {
    if (leaseOptions.length === 0) return null
    return new PriceMatrix(leaseOptions)
  }, [leaseOptions])

  // Generate price impacts for each dimension
  const mileagePriceImpacts = useMemo(() => {
    if (!priceMatrix || !selectedLease || selectedPeriod === null || selectedUpfront === null) {
      return new Map()
    }
    
    return new Map(
      availableMileages.map(mileage => [
        mileage,
        priceMatrix.getPriceImpact(
          selectedLease.monthly_price,
          mileage,
          selectedPeriod,
          selectedUpfront
        )
      ])
    )
  }, [priceMatrix, selectedLease, selectedPeriod, selectedUpfront, availableMileages])

  const periodPriceImpacts = useMemo(() => {
    if (!priceMatrix || !selectedLease || selectedMileage === null || selectedUpfront === null) {
      return new Map()
    }
    
    return new Map(
      availablePeriods.map(period => [
        period,
        priceMatrix.getPriceImpact(
          selectedLease.monthly_price,
          selectedMileage,
          period,
          selectedUpfront
        )
      ])
    )
  }, [priceMatrix, selectedLease, selectedMileage, selectedUpfront, availablePeriods])

  const upfrontPriceImpacts = useMemo(() => {
    if (!priceMatrix || !selectedLease || selectedMileage === null || selectedPeriod === null) {
      return new Map()
    }
    
    return new Map(
      availableUpfronts.map(upfront => [
        upfront,
        priceMatrix.getPriceImpact(
          selectedLease.monthly_price,
          selectedMileage,
          selectedPeriod,
          upfront
        )
      ])
    )
  }, [priceMatrix, selectedLease, selectedMileage, selectedPeriod, availableUpfronts])

  // Compute hover state for instant feedback
  const hoveredPriceImpact = useMemo(() => {
    if (!hoveredOption || !priceMatrix || !selectedLease) return null
    
    const { dimension, value } = hoveredOption
    
    switch (dimension) {
      case 'mileage':
        if (selectedPeriod === null || selectedUpfront === null) return null
        return priceMatrix.getPriceImpact(
          selectedLease.monthly_price,
          value,
          selectedPeriod,
          selectedUpfront
        )
      case 'period':
        if (selectedMileage === null || selectedUpfront === null) return null
        return priceMatrix.getPriceImpact(
          selectedLease.monthly_price,
          selectedMileage,
          value,
          selectedUpfront
        )
      case 'upfront':
        if (selectedMileage === null || selectedPeriod === null) return null
        return priceMatrix.getPriceImpact(
          selectedLease.monthly_price,
          selectedMileage,
          selectedPeriod,
          value
        )
      default:
        return null
    }
  }, [hoveredOption, priceMatrix, selectedLease, selectedMileage, selectedPeriod, selectedUpfront])

  // Reset to cheapest option
  const resetToCheapest = () => {
    if (!cheapestOption) return
    
    setSelectedMileage(cheapestOption.mileage_per_year)
    setSelectedPeriod(cheapestOption.period_months)
    setSelectedUpfront(cheapestOption.first_payment)
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
    error,
    totalCost,
    cheapestOption,
    isCheapest,
    priceDifference,
    priceMatrix,
    mileagePriceImpacts,
    periodPriceImpacts,
    upfrontPriceImpacts,
    setHoveredOption,
    hoveredPriceImpact
  }
}