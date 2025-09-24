import { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from 'react'
import type { CarListing, LeaseOptionWithScore } from '@/types'
import type { HoveredOption, PriceImpactData } from '@/types/priceImpact'
import { useOffers } from './useOffers'
import { PriceMatrix } from '@/lib/priceMatrix'
import { calculateLeaseScoreSimple } from '@/lib/leaseScore'
// import { useLeaseCalculatorDebug } from './useLeaseCalculatorDebug' // Uncomment for debugging

export interface LeaseOption {
  mileage_per_year: number
  period_months: number
  first_payment: number
  monthly_price: number
}

// Legacy function for backwards compatibility - now using shared module
export const calculateLeaseScore = (
  monthlyPrice: number,
  retailPrice: number,
  mileagePerYear: number,
  periodMonths: number
): number => {
  return calculateLeaseScoreSimple({
    monthlyPrice,
    retailPrice,
    mileagePerYear,
    firstPayment: 0, // Legacy calls don't have first payment info
    contractMonths: periodMonths
  })
}

// Initialization status for clearer UI state management
export type InitStatus = 'pending' | 'loading' | 'empty' | 'initialized' | 'error'

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
  initStatus: InitStatus  // New: explicit status for UI
}

export const useLeaseCalculator = (car: CarListing | undefined): LeaseCalculatorData => {
  const [selectedMileage, setSelectedMileageState] = useState<number | null>(null)
  const [selectedPeriod, setSelectedPeriodState] = useState<number | null>(null)
  const [selectedUpfront, setSelectedUpfrontState] = useState<number | null>(null)
  const [hoveredOption, setHoveredOption] = useState<HoveredOption | null>(null)
  
  // New: Initialization status state machine
  const [initStatus, setInitStatus] = useState<InitStatus>('pending')

  // Enhanced refs for explicit initialization tracking
  const initializedForCarRef = useRef<string | null>(null)
  const initSourceRef = useRef<'url' | 'car' | 'default' | 'recovery' | 'fallback' | null>(null)
  const userOverrideRef = useRef(false)
  const serverSelectionRef = useRef<string | null>(null)

  const composeSelectionKey = useCallback((
    mileage: number | null,
    period: number | null,
    upfront: number | null
  ) => `${mileage ?? 'null'}|${period ?? 'null'}|${upfront ?? 'null'}`, [])

  const setSelectedMileageInternal = useCallback((value: number | null, source: 'user' | 'system') => {
    if (source === 'user') {
      userOverrideRef.current = true
    }
    setSelectedMileageState(value)
  }, [])

  const setSelectedPeriodInternal = useCallback((value: number | null, source: 'user' | 'system') => {
    if (source === 'user') {
      userOverrideRef.current = true
    }
    setSelectedPeriodState(value)
  }, [])

  const setSelectedUpfrontInternal = useCallback((value: number | null, source: 'user' | 'system') => {
    if (source === 'user') {
      userOverrideRef.current = true
    }
    setSelectedUpfrontState(value)
  }, [])

  // SSR-safe layout effect for preventing flicker
  const useIsomorphicLayoutEffect = 
    typeof window !== 'undefined' ? useLayoutEffect : useEffect

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

  // Calculate lease scores for all options using v2.0 formula
  const leaseOptionsWithScores = useMemo(() => {
    if (!car?.retail_price || leaseOptions.length === 0) return []
    
    return leaseOptions.map(option => ({
      ...option,
      lease_score: calculateLeaseScoreSimple({
        monthlyPrice: option.monthly_price,
        retailPrice: car.retail_price!,
        mileagePerYear: option.mileage_per_year,
        firstPayment: option.first_payment,
        contractMonths: option.period_months // Included for compatibility but ignored in v2
      })
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
    
    setSelectedMileageInternal(cheapestOption.mileage_per_year, 'user')
    setSelectedPeriodInternal(cheapestOption.period_months, 'user')
    setSelectedUpfrontInternal(cheapestOption.first_payment, 'user')
  }, [cheapestOption, setSelectedMileageInternal, setSelectedPeriodInternal, setSelectedUpfrontInternal])

  // Select best score option
  const selectBestScore = useCallback(() => {
    if (!bestScoreOption) return
    
    setSelectedMileageInternal(bestScoreOption.mileage_per_year, 'user')
    setSelectedPeriodInternal(bestScoreOption.period_months, 'user')
    setSelectedUpfrontInternal(bestScoreOption.first_payment, 'user')
  }, [bestScoreOption, setSelectedMileageInternal, setSelectedPeriodInternal, setSelectedUpfrontInternal])

  // Enhanced Solution C: Deterministic initialization with explicit tracking
  useIsomorphicLayoutEffect(() => {
    const carKey = car?.listing_id || car?.id || null
    
    // Guard against null keys during transitions
    if (!carKey) {
      setInitStatus('pending')
      return
    }
    
    // Debug logging for development
    if (import.meta.env.DEV) {
      console.log('[LeaseCalc] Effect run', {
        carKey,
        initializedFor: initializedForCarRef.current,
        isLoading,
        hasError: !!error,
        optionsCount: leaseOptions.length,
        initStatus,
        source: initSourceRef.current
      })
    }
    
    // Check if we need to initialize for this car
    if (initializedForCarRef.current !== carKey) {
      // Reset state for genuinely new car (not first mount)
      if (initializedForCarRef.current !== null) {
        setSelectedMileageInternal(null, 'system')
        setSelectedPeriodInternal(null, 'system')
        setSelectedUpfrontInternal(null, 'system')
        initSourceRef.current = null
      }
      userOverrideRef.current = false
      serverSelectionRef.current = null
      
      // Handle loading state - wait for offers
      if (isLoading) {
        setInitStatus('loading')
        return
      }
      
      // Handle error state
      if (error) {
        setInitStatus('error')
        return
      }
      
      // Handle empty state (no offers available)
      if (!leaseOptions.length) {
        setInitStatus('empty')
        return
      }
      
      // Proceed with initialization
      const targetMileage = car?.selected_mileage ?? car?.mileage_per_year ?? null
      const targetPeriod = car?.selected_term ?? car?.period_months ?? null
      const targetUpfront = car?.selected_deposit ?? car?.first_payment ?? null

      if (targetMileage != null) {
        // 1) Try exact match of mileage+period+upfront
        const exact = leaseOptions.find(o =>
          o.mileage_per_year === targetMileage &&
          (targetPeriod == null || o.period_months === targetPeriod) &&
          (targetUpfront == null || o.first_payment === targetUpfront)
        )
        if (exact) {
          setSelectedMileageInternal(exact.mileage_per_year, 'system')
          setSelectedPeriodInternal(exact.period_months, 'system')
          setSelectedUpfrontInternal(exact.first_payment, 'system')
          initializedForCarRef.current = carKey
          setInitStatus('initialized')
          initSourceRef.current = car?.selected_mileage ? 'url' : 'car'
          serverSelectionRef.current = composeSelectionKey(
            exact.mileage_per_year,
            exact.period_months,
            exact.first_payment
          )
          return
        }

        // 2) Try best option with same mileage
        const sameMileage = leaseOptions.filter(o => o.mileage_per_year === targetMileage)
        if (sameMileage.length) {
          const periodPref = [36, 24, 48]

          const prioritized = [...sameMileage]
            .sort((a, b) => {
              // 1. Prefer deposits closest to the requested value when known
              const requestedDeposit = targetUpfront ?? car?.selected_deposit ?? car?.first_payment ?? null
              if (requestedDeposit != null) {
                const diffA = Math.abs(a.first_payment - requestedDeposit)
                const diffB = Math.abs(b.first_payment - requestedDeposit)
                if (diffA !== diffB) {
                  return diffA - diffB
                }
              }

              // 2. Honour period preferences
              const ai = periodPref.indexOf(a.period_months)
              const bi = periodPref.indexOf(b.period_months)
              if (ai !== bi) {
                // Treat terms outside preference list as lower priority
                if (ai === -1) return 1
                if (bi === -1) return -1
                return ai - bi
              }

              // 3. Tie-breaker: lower monthly price
              if (a.monthly_price !== b.monthly_price) {
                return a.monthly_price - b.monthly_price
              }

              // 4. Final tie-breaker: higher deposit (less risk of over-selecting 0)
              return b.first_payment - a.first_payment
            })

          const best = prioritized[0]

          setSelectedMileageInternal(best.mileage_per_year, 'system')
          setSelectedPeriodInternal(best.period_months, 'system')
          setSelectedUpfrontInternal(best.first_payment, 'system')
          initializedForCarRef.current = carKey
          setInitStatus('initialized')
          initSourceRef.current = car?.selected_mileage ? 'url' : 'car'
          serverSelectionRef.current = composeSelectionKey(
            best.mileage_per_year,
            best.period_months,
            best.first_payment
          )
          return
        }
      }

      // 3) Final fallback: cheapest overall
      if (cheapestOption) {
        setSelectedMileageInternal(cheapestOption.mileage_per_year, 'system')
        setSelectedPeriodInternal(cheapestOption.period_months, 'system')
        setSelectedUpfrontInternal(cheapestOption.first_payment, 'system')
        initializedForCarRef.current = carKey
        setInitStatus('initialized')
        initSourceRef.current = 'default'
        serverSelectionRef.current = composeSelectionKey(
          cheapestOption.mileage_per_year,
          cheapestOption.period_months,
          cheapestOption.first_payment
        )
      }
    } else {
      // Recovery logic for previously initialized car
      // Check if we can recover from error/empty states
      if ((initStatus === 'error' || initStatus === 'empty') && !isLoading && !error && leaseOptions.length > 0) {
        // Retry initialization for error/empty recovery
        const targetMileage = car?.selected_mileage ?? car?.mileage_per_year ?? null
        const targetPeriod = car?.selected_term ?? car?.period_months ?? null
        const targetUpfront = car?.selected_deposit ?? car?.first_payment ?? null

        if (targetMileage != null) {
          // Try exact match first
          const exact = leaseOptions.find(o =>
            o.mileage_per_year === targetMileage &&
            (targetPeriod == null || o.period_months === targetPeriod) &&
            (targetUpfront == null || o.first_payment === targetUpfront)
          )
          if (exact) {
            setSelectedMileageInternal(exact.mileage_per_year, 'system')
            setSelectedPeriodInternal(exact.period_months, 'system')
            setSelectedUpfrontInternal(exact.first_payment, 'system')
            initializedForCarRef.current = carKey
            setInitStatus('initialized')
            initSourceRef.current = car?.selected_mileage ? 'url' : 'car'
            serverSelectionRef.current = composeSelectionKey(
              exact.mileage_per_year,
              exact.period_months,
              exact.first_payment
            )
            return
          }

          // Try best option with same mileage
          const sameMileage = leaseOptions.filter(o => o.mileage_per_year === targetMileage)
          if (sameMileage.length) {
            const periodPref = [36, 24, 48]

            const prioritized = [...sameMileage]
              .sort((a, b) => {
                const requestedDeposit = targetUpfront ?? car?.selected_deposit ?? car?.first_payment ?? null
                if (requestedDeposit != null) {
                  const diffA = Math.abs(a.first_payment - requestedDeposit)
                  const diffB = Math.abs(b.first_payment - requestedDeposit)
                  if (diffA !== diffB) {
                    return diffA - diffB
                  }
                }

                const ai = periodPref.indexOf(a.period_months)
                const bi = periodPref.indexOf(b.period_months)
                if (ai !== bi) {
                  if (ai === -1) return 1
                  if (bi === -1) return -1
                  return ai - bi
                }

                if (a.monthly_price !== b.monthly_price) {
                  return a.monthly_price - b.monthly_price
                }

                return b.first_payment - a.first_payment
              })

            const best = prioritized[0]

            setSelectedMileageInternal(best.mileage_per_year, 'system')
            setSelectedPeriodInternal(best.period_months, 'system')
            setSelectedUpfrontInternal(best.first_payment, 'system')
            initializedForCarRef.current = carKey
            setInitStatus('initialized')
            initSourceRef.current = car?.selected_mileage ? 'url' : 'car'
            serverSelectionRef.current = composeSelectionKey(
              best.mileage_per_year,
              best.period_months,
              best.first_payment
            )
            return
          }
        }

        // Final fallback: cheapest overall
        if (cheapestOption) {
          setSelectedMileageInternal(cheapestOption.mileage_per_year, 'system')
          setSelectedPeriodInternal(cheapestOption.period_months, 'system')
          setSelectedUpfrontInternal(cheapestOption.first_payment, 'system')
          initializedForCarRef.current = carKey
          setInitStatus('initialized')
          initSourceRef.current = 'recovery'
          serverSelectionRef.current = composeSelectionKey(
            cheapestOption.mileage_per_year,
            cheapestOption.period_months,
            cheapestOption.first_payment
          )
        }
      }

      // Synchronize with server-provided selection when no user overrides exist
      if (!userOverrideRef.current && initStatus === 'initialized' && leaseOptions.length > 0) {
        const serverMileage = car?.selected_mileage ?? car?.mileage_per_year ?? null
        const serverPeriod = car?.selected_term ?? car?.period_months ?? null
        const serverUpfront = car?.selected_deposit ?? car?.first_payment ?? null
        const serverKey = composeSelectionKey(serverMileage, serverPeriod, serverUpfront)
        const emptyKey = composeSelectionKey(null, null, null)

        if (serverKey !== serverSelectionRef.current && serverKey !== emptyKey && serverMileage != null) {
          const sameMileage = leaseOptions.filter(o => o.mileage_per_year === serverMileage)

          if (sameMileage.length) {
            let next = sameMileage.find(o =>
              (serverPeriod == null || o.period_months === serverPeriod) &&
              (serverUpfront == null || o.first_payment === serverUpfront)
            )

            if (!next) {
              const periodPref = Array.from(new Set([
                serverPeriod,
                36,
                24,
                48,
              ].filter((value): value is number => value != null)))

              if (periodPref.length) {
                next = sameMileage
                  .filter(o => periodPref.includes(o.period_months))
                  .sort((a, b) => {
                    const ai = periodPref.indexOf(a.period_months)
                    const bi = periodPref.indexOf(b.period_months)
                    if (ai !== bi) return ai - bi
                    if (serverUpfront != null) {
                      const ad = Math.abs((a.first_payment ?? 0) - serverUpfront)
                      const bd = Math.abs((b.first_payment ?? 0) - serverUpfront)
                      if (ad !== bd) return ad - bd
                    }
                    return a.monthly_price - b.monthly_price
                  })[0]
              }
            }

            if (!next) {
              next = sameMileage.reduce((prev, curr) => (prev.monthly_price <= curr.monthly_price ? prev : curr))
            }

            if (next) {
              setSelectedMileageInternal(next.mileage_per_year, 'system')
              setSelectedPeriodInternal(next.period_months, 'system')
              setSelectedUpfrontInternal(next.first_payment, 'system')
              serverSelectionRef.current = serverKey
            }
          }
        }
      }

      // Mismatch fallback: Handle invalid selections
      if (initStatus === 'initialized' && leaseOptions.length > 0 && !selectedLease) {
        if (cheapestOption) {
          setSelectedMileageInternal(cheapestOption.mileage_per_year, 'system')
          setSelectedPeriodInternal(cheapestOption.period_months, 'system')
          setSelectedUpfrontInternal(cheapestOption.first_payment, 'system')
          initSourceRef.current = 'fallback'
          serverSelectionRef.current = composeSelectionKey(
            cheapestOption.mileage_per_year,
            cheapestOption.period_months,
            cheapestOption.first_payment
          )
        }
      }
    }
    
  }, [
    car?.listing_id, car?.id,
    isLoading, error,  // Add these to dependencies for proper state handling
    leaseOptions.length, cheapestOption,
    car?.selected_mileage, car?.mileage_per_year,
    car?.selected_term, car?.period_months,
    car?.selected_deposit, car?.first_payment,
    selectedLease, // Needed for mismatch fallback logic
    initStatus, // Needed for recovery logic
    composeSelectionKey,
    setSelectedMileageInternal,
    setSelectedPeriodInternal,
    setSelectedUpfrontInternal,
    leaseOptions
    // Do NOT include selected* states to avoid loops (except selectedLease for fallback)
  ])

  const setSelectedMileage = useCallback((value: number) => {
    setSelectedMileageInternal(value, 'user')
  }, [setSelectedMileageInternal])

  const setSelectedPeriod = useCallback((value: number) => {
    setSelectedPeriodInternal(value, 'user')
  }, [setSelectedPeriodInternal])

  const setSelectedUpfront = useCallback((value: number) => {
    setSelectedUpfrontInternal(value, 'user')
  }, [setSelectedUpfrontInternal])

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
    hoveredPriceImpact,
    initStatus
  }
}
