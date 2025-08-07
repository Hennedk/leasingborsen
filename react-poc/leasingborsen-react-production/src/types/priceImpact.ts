export interface PriceImpactData {
  available: boolean
  newPrice?: number
  difference?: number
  percentageChange?: number
  isIncrease?: boolean
  isDecrease?: boolean
  isSame?: boolean
  isCheapest?: boolean
  isMostExpensive?: boolean
}

export interface PriceImpactDisplayProps {
  impact: PriceImpactData
  format?: 'compact' | 'detailed' | 'inline'
  showPercentage?: boolean
  showArrow?: boolean
  animate?: boolean
}

export interface HoveredOption {
  dimension: 'mileage' | 'period' | 'upfront'
  value: number
}

export interface PriceMatrixStatistics {
  cheapestPrice: number
  mostExpensivePrice: number
  averagePrice: number
  totalOptions: number
}