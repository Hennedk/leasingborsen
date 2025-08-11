import { useMemo } from 'react'

export interface RangeFilterOptions {
  steps: number[]
  minValue?: number | null
  maxValue?: number | null
  formatter?: (value: number) => string
  minLabel?: string
  maxLabel?: string
}

/**
 * Shared hook for range filter logic with validation
 * Used by both desktop and mobile filter components
 */
export const useRangeFilter = ({
  steps,
  minValue,
  maxValue,
  formatter,
  minLabel = 'Min',
  maxLabel = 'Max'
}: RangeFilterOptions) => {
  // Filter options based on selected values to prevent invalid ranges
  const filteredMinSteps = useMemo(() => {
    if (!maxValue) return steps
    return steps.filter(step => step <= maxValue)
  }, [steps, maxValue])
  
  const filteredMaxSteps = useMemo(() => {
    if (!minValue) return steps
    return steps.filter(step => step >= minValue)
  }, [steps, minValue])

  // Format display values
  const formatValue = useMemo(() => {
    return formatter || ((value: number) => value.toString())
  }, [formatter])

  // Validation helpers
  const isValidRange = useMemo(() => {
    if (!minValue || !maxValue) return true
    return minValue <= maxValue
  }, [minValue, maxValue])

  const getValidationMessage = useMemo(() => {
    return () => {
      if (!isValidRange) {
        return 'Minimum værdi må ikke være højere end maksimum værdi'
      }
      return null
    }
  }, [isValidRange])

  return {
    filteredMinSteps,
    filteredMaxSteps,
    formatValue,
    isValidRange,
    getValidationMessage,
    minLabel,
    maxLabel
  }
}