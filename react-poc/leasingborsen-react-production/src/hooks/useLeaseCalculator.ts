import { useState, useEffect, useMemo, useCallback } from 'react'
import type { CarListing, LeaseOptionWithScore } from '@/types'
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

// Lease score calculation function (simplified version of Edge Function logic)
const calculateLeaseScore = (
  monthlyPrice: number,
  retailPrice: number,
  mileagePerYear: number,
  periodMonths: number
): number => {
  // Monthly Rate Score (45% weight)
  const monthlyRatePercent = (monthlyPrice / retailPrice) * 100
  let monthlyRateScore = 100
  if (monthlyRatePercent > 0.9) monthlyRateScore = 90
  if (monthlyRatePercent > 1.1) monthlyRateScore = 80
  if (monthlyRatePercent > 1.3) monthlyRateScore = 70
  if (monthlyRatePercent > 1.5) monthlyRateScore = 60
  if (monthlyRatePercent > 1.7) monthlyRateScore = 50
  if (monthlyRatePercent > 1.9) monthlyRateScore = 40
  if (monthlyRatePercent > 2.1) monthlyRateScore = 25

  // Mileage Score (35% weight)
  let mileageScore = 20
  if (mileagePerYear >= 25000) mileageScore = 100
  else if (mileagePerYear >= 20000) mileageScore = 90
  else if (mileagePerYear >= 15000) mileageScore = 75
  else if (mileagePerYear >= 12000) mileageScore = 55
  else if (mileagePerYear >= 10000) mileageScore = 35

  // Flexibility Score (20% weight)
  let flexibilityScore = 30
  if (periodMonths <= 12) flexibilityScore = 100
  else if (periodMonths <= 24) flexibilityScore = 90
  else if (periodMonths <= 36) flexibilityScore = 75
  else if (periodMonths <= 48) flexibilityScore = 55

  // Calculate weighted total
  const totalScore = Math.round(
    (monthlyRateScore * 0.45) + 
    (mileageScore * 0.35) + 
    (flexibilityScore * 0.20)
  )

  return Math.max(0, Math.min(100, totalScore))
}

export interface LeaseCalculatorData {
  selectedMileage: number | null
  selectedPeriod: number | null
  selectedUpfront: number | null
  selectedLease: LeaseOption | undefined
  selectedLeaseScore: number | undefined
  availableMileages: number[]
  availablePeriods: number[]
  availableUpfronts: number[]
  leaseOptions: LeaseOption[]
  leaseOptionsWithScores: LeaseOptionWithScore[]
  setSelectedMileage: (value: number) => void
  setSelectedPeriod: (value: number) => void
  setSelectedUpfront: (value: number) => void
  resetToCheapest: () => void
  selectBestScore: () => void
  isLoading: boolean
  error: Error | null
  totalCost: number | null
  cheapestOption: LeaseOption | undefined
  bestScoreOption: LeaseOptionWithScore | undefined
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

  // Calculate lease scores for all options
  const leaseOptionsWithScores = useMemo(() => {
    if (!car?.retail_price || leaseOptions.length === 0) return []
    
    return leaseOptions.map(option => ({
      ...option,
      lease_score: calculateLeaseScore(
        option.monthly_price,
        car.retail_price!,
        option.mileage_per_year,
        option.period_months
      )
    }))
  }, [leaseOptions, car?.retail_price])

  // Find best score option
  const bestScoreOption = useMemo(() => {
    if (leaseOptionsWithScores.length === 0) return undefined
    return leaseOptionsWithScores.reduce((prev, curr) => 
      (curr.lease_score || 0) > (prev.lease_score || 0) ? curr : prev
    )
  }, [leaseOptionsWithScores])

  // Calculate selected lease score
  const selectedLeaseScore = useMemo(() => {
    if (!selectedLease || leaseOptionsWithScores.length === 0) return undefined
    
    const selectedWithScore = leaseOptionsWithScores.find(option =>
      option.mileage_per_year === selectedLease.mileage_per_year &&
      option.period_months === selectedLease.period_months &&
      option.first_payment === selectedLease.first_payment
    )
    
    return selectedWithScore?.lease_score
  }, [selectedLease, leaseOptionsWithScores])

  // Reset to cheapest option
  const resetToCheapest = useCallback(() => {
    if (!cheapestOption) return
    
    setSelectedMileage(cheapestOption.mileage_per_year)
    setSelectedPeriod(cheapestOption.period_months)
    setSelectedUpfront(cheapestOption.first_payment)
  }, [cheapestOption])

  // Select best score option
  const selectBestScore = useCallback(() => {
    if (!bestScoreOption) return
    
    setSelectedMileage(bestScoreOption.mileage_per_year)
    setSelectedPeriod(bestScoreOption.period_months)
    setSelectedUpfront(bestScoreOption.first_payment)
  }, [bestScoreOption])

  // Initialize with cheapest option
  useEffect(() => {
    if (leaseOptions.length && !selectedLease) {
      resetToCheapest()
    }
  }, [leaseOptions, selectedLease, resetToCheapest])

  return {
    selectedMileage,
    selectedPeriod,
    selectedUpfront,
    selectedLease,
    selectedLeaseScore,
    availableMileages,
    availablePeriods,
    availableUpfronts,
    leaseOptions,
    leaseOptionsWithScores,
    setSelectedMileage,
    setSelectedPeriod,
    setSelectedUpfront,
    resetToCheapest,
    selectBestScore,
    isLoading,
    error,
    totalCost,
    cheapestOption,
    bestScoreOption,
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