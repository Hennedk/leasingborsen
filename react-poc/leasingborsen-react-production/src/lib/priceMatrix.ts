import type { LeaseOption } from '@/hooks/useLeaseCalculator'
import type { PriceImpactData } from '@/types/priceImpact'

export class PriceMatrix {
  private matrix: Map<string, LeaseOption>
  private cheapestPrice: number
  private mostExpensivePrice: number
  private averagePrice: number
  
  constructor(leaseOptions: LeaseOption[]) {
    this.matrix = new Map()
    this.cheapestPrice = Infinity
    this.mostExpensivePrice = -Infinity
    let totalPrice = 0
    
    this.buildMatrix(leaseOptions)
    this.calculateStatistics(leaseOptions)
    
    // Calculate average
    if (leaseOptions.length > 0) {
      for (const option of leaseOptions) {
        totalPrice += option.monthly_price
      }
      this.averagePrice = totalPrice / leaseOptions.length
    } else {
      this.averagePrice = 0
    }
  }
  
  private buildMatrix(options: LeaseOption[]): void {
    this.matrix = new Map()
    options.forEach(option => {
      const key = this.getKey(
        option.mileage_per_year,
        option.period_months,
        option.first_payment
      )
      this.matrix.set(key, option)
    })
  }
  
  private calculateStatistics(options: LeaseOption[]): void {
    if (options.length === 0) {
      this.cheapestPrice = 0
      this.mostExpensivePrice = 0
      return
    }
    
    for (const option of options) {
      if (option.monthly_price < this.cheapestPrice) {
        this.cheapestPrice = option.monthly_price
      }
      if (option.monthly_price > this.mostExpensivePrice) {
        this.mostExpensivePrice = option.monthly_price
      }
    }
  }
  
  private getKey(mileage: number, period: number, upfront: number): string {
    return `${mileage}-${period}-${upfront}`
  }
  
  public getPrice(mileage: number, period: number, upfront: number): number | null {
    const option = this.matrix.get(this.getKey(mileage, period, upfront))
    return option?.monthly_price ?? null
  }
  
  public getOption(mileage: number, period: number, upfront: number): LeaseOption | null {
    return this.matrix.get(this.getKey(mileage, period, upfront)) ?? null
  }
  
  public getPriceImpact(
    currentPrice: number,
    mileage: number,
    period: number,
    upfront: number
  ): PriceImpactData {
    const newPrice = this.getPrice(mileage, period, upfront)
    if (newPrice === null) {
      return { available: false }
    }
    
    const difference = newPrice - currentPrice
    const percentageChange = currentPrice > 0 ? (difference / currentPrice) * 100 : 0
    
    return {
      available: true,
      newPrice,
      difference,
      percentageChange,
      isIncrease: difference > 0,
      isDecrease: difference < 0,
      isSame: Math.abs(difference) < 0.01, // Handle floating point comparison
      isCheapest: Math.abs(newPrice - this.cheapestPrice) < 0.01,
      isMostExpensive: Math.abs(newPrice - this.mostExpensivePrice) < 0.01
    }
  }
  
  public getPriceRangeForDimension(
    dimension: 'mileage' | 'period' | 'upfront',
    fixedValues: {
      mileage?: number
      period?: number
      upfront?: number
    }
  ): Map<number, number> {
    const prices = new Map<number, number>()
    
    this.matrix.forEach((option) => {
      let shouldInclude = false
      let dimensionValue = 0
      
      switch (dimension) {
        case 'mileage':
          if (
            (!fixedValues.period || option.period_months === fixedValues.period) &&
            (!fixedValues.upfront || option.first_payment === fixedValues.upfront)
          ) {
            shouldInclude = true
            dimensionValue = option.mileage_per_year
          }
          break
          
        case 'period':
          if (
            (!fixedValues.mileage || option.mileage_per_year === fixedValues.mileage) &&
            (!fixedValues.upfront || option.first_payment === fixedValues.upfront)
          ) {
            shouldInclude = true
            dimensionValue = option.period_months
          }
          break
          
        case 'upfront':
          if (
            (!fixedValues.mileage || option.mileage_per_year === fixedValues.mileage) &&
            (!fixedValues.period || option.period_months === fixedValues.period)
          ) {
            shouldInclude = true
            dimensionValue = option.first_payment
          }
          break
      }
      
      if (shouldInclude) {
        prices.set(dimensionValue, option.monthly_price)
      }
    })
    
    return prices
  }
  
  public getCheapestOption(): LeaseOption | null {
    let cheapest: LeaseOption | null = null
    
    this.matrix.forEach(option => {
      if (!cheapest || option.monthly_price < cheapest.monthly_price) {
        cheapest = option
      }
    })
    
    return cheapest
  }
  
  public getStatistics() {
    return {
      cheapestPrice: this.cheapestPrice,
      mostExpensivePrice: this.mostExpensivePrice,
      averagePrice: this.averagePrice,
      totalOptions: this.matrix.size
    }
  }
}