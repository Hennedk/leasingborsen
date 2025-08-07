import { useEffect } from 'react'
import type { LeaseOption } from './useLeaseCalculator'
import { PriceMatrix } from '@/lib/priceMatrix'

export const useLeaseCalculatorDebug = (
  leaseOptions: LeaseOption[],
  priceMatrix: PriceMatrix | null,
  selectedMileage: number | null,
  selectedPeriod: number | null,
  selectedUpfront: number | null
) => {
  useEffect(() => {
    if (leaseOptions.length > 0) {
      console.log('=== Lease Calculator Debug ===')
      console.log('Total lease options:', leaseOptions.length)
      
      // Show unique values for each dimension
      const uniqueMileages = [...new Set(leaseOptions.map(o => o.mileage_per_year))].sort((a, b) => a - b)
      const uniquePeriods = [...new Set(leaseOptions.map(o => o.period_months))].sort((a, b) => a - b)
      const uniqueUpfronts = [...new Set(leaseOptions.map(o => o.first_payment))].sort((a, b) => a - b)
      
      console.log('Unique mileages:', uniqueMileages)
      console.log('Unique periods:', uniquePeriods)
      console.log('Unique upfronts:', uniqueUpfronts)
      
      // Show current selection
      console.log('Current selection:', {
        mileage: selectedMileage,
        period: selectedPeriod,
        upfront: selectedUpfront
      })
      
      // Show all available combinations
      console.log('Available combinations:')
      leaseOptions.forEach(option => {
        console.log(`  ${option.mileage_per_year}km - ${option.period_months}mo - ${option.first_payment}kr = ${option.monthly_price}kr/mo`)
      })
      
      // Test price matrix lookups
      if (priceMatrix && selectedPeriod && selectedUpfront) {
        console.log('Testing price lookups for different mileages:')
        uniqueMileages.forEach(mileage => {
          const price = priceMatrix.getPrice(mileage, selectedPeriod, selectedUpfront)
          console.log(`  ${mileage}km: ${price ? price + 'kr/mo' : 'NOT FOUND'}`)
        })
      }
    }
  }, [leaseOptions, priceMatrix, selectedMileage, selectedPeriod, selectedUpfront])
}