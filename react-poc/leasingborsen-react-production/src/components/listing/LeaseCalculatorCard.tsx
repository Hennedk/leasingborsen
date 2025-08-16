import React, { useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Loader2, AlertTriangle, TrendingDown } from 'lucide-react'
import AnimatedPrice from './AnimatedPrice'
import PriceImpactSelectItem from './PriceImpactSelectItem'
import type { LeaseOption } from '@/types'
import type { PriceImpactData, HoveredOption } from '@/types/priceImpact'

interface LeaseCalculatorCardProps {
  selectedLease: LeaseOption | undefined
  selectedMileage: number | null
  selectedPeriod: number | null
  selectedUpfront: number | null
  availableMileages: number[]
  availablePeriods: number[]
  availableUpfronts: number[]
  onMileageChange: (value: number) => void
  onPeriodChange: (value: number) => void
  onUpfrontChange: (value: number) => void
  onResetToCheapest: () => void
  isLoading?: boolean
  error?: any
  isCheapest?: boolean
  priceDifference?: number
  mileagePriceImpacts?: Map<number, PriceImpactData>
  periodPriceImpacts?: Map<number, PriceImpactData>
  upfrontPriceImpacts?: Map<number, PriceImpactData>
  onHoverOption?: (option: HoveredOption | null) => void
}

const LeaseCalculatorCard = React.memo<LeaseCalculatorCardProps>(({
  selectedLease,
  selectedMileage,
  selectedPeriod,
  selectedUpfront,
  availableMileages,
  availablePeriods,
  availableUpfronts,
  onMileageChange,
  onPeriodChange,
  onUpfrontChange,
  onResetToCheapest,
  isLoading = false,
  error = null,
  isCheapest = false,
  priceDifference = 0,
  mileagePriceImpacts,
  periodPriceImpacts,
  upfrontPriceImpacts,
  onHoverOption
}) => {
  const handleMileageHover = useCallback((mileage: number) => {
    onHoverOption?.({ dimension: 'mileage', value: mileage })
  }, [onHoverOption])
  
  const handlePeriodHover = useCallback((period: number) => {
    onHoverOption?.({ dimension: 'period', value: period })
  }, [onHoverOption])
  
  const handleUpfrontHover = useCallback((upfront: number) => {
    onHoverOption?.({ dimension: 'upfront', value: upfront })
  }, [onHoverOption])
  
  const handleHoverEnd = useCallback(() => {
    onHoverOption?.(null)
  }, [onHoverOption])
  return (
    <Card className="hidden lg:block bg-card border border-border/50 rounded-xl overflow-hidden sticky top-[90px] shadow-[0_0_20px_rgba(0,0,0,0.08)]">
      <CardContent className="p-5 space-y-4 relative">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Indlæser prisindstillinger...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertTriangle className="w-6 h-6 text-destructive mx-auto mb-2" />
              <p className="text-sm text-destructive">Kunne ikke indlæse prisindstillinger</p>
            </div>
          </div>
        )}

        {/* Content - Only show when not loading and no error */}
        {!isLoading && !error && (
          <>
            {/* Subtle price indicator */}
            {!isCheapest && (
              <div className="mb-3">
                <Button
                  variant="ghost"
                  onClick={onResetToCheapest}
                  className="w-full h-8 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  size="sm"
                >
                  <TrendingDown className="w-3 h-3 mr-1" />
                  Vælg billigste ({priceDifference > 0 ? `-${priceDifference.toLocaleString('da-DK')} kr/md` : 'tilgængelig'})
                </Button>
              </div>
            )}

            {/* Enhanced Price Display */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Ydelse pr. måned
              </Label>
              <div className="flex items-baseline gap-2">
                <AnimatedPrice 
                  value={selectedLease?.monthly_price ?? 0}
                  className="text-3xl font-bold text-foreground"
                  showCurrency={true}
                  showPeriod={true}
                />
              </div>
              
            </div>

        {/* Form Fields */}
        <div className="space-y-4">
          {/* Mileage Selection */}
          <div>
            <Select 
              value={selectedMileage?.toString() || ''} 
              onValueChange={(value) => onMileageChange(parseInt(value))}
              disabled={availableMileages.length <= 1}
            >
              <SelectTrigger size="default" background="primary" className="w-full text-foreground font-medium border-border">
                <SelectValue placeholder="Vælg km-forbrug" className="text-foreground" />
              </SelectTrigger>
              <SelectContent>
                {availableMileages.map((mileage) => (
                  <PriceImpactSelectItem
                    key={`mileage-${mileage}`}
                    value={mileage.toString()}
                    label={`${mileage.toLocaleString('da-DK')} km/år`}
                    impact={mileagePriceImpacts?.get(mileage)}
                    isSelected={mileage === selectedMileage}
                    onHover={() => handleMileageHover(mileage)}
                    onHoverEnd={handleHoverEnd}
                  />
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Period Selection */}
          <div>
            <Select 
              value={selectedPeriod?.toString() || ''} 
              onValueChange={(value) => onPeriodChange(parseInt(value))}
              disabled={availablePeriods.length <= 1}
            >
              <SelectTrigger size="default" background="primary" className="w-full text-foreground font-medium border-border">
                <SelectValue placeholder="Vælg periode" className="text-foreground" />
              </SelectTrigger>
              <SelectContent>
                {availablePeriods.map((period) => (
                  <PriceImpactSelectItem
                    key={`period-${period}`}
                    value={period.toString()}
                    label={`${period} måneder`}
                    impact={periodPriceImpacts?.get(period)}
                    isSelected={period === selectedPeriod}
                    onHover={() => handlePeriodHover(period)}
                    onHoverEnd={handleHoverEnd}
                  />
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Upfront Payment Selection */}
          <div>
            <Select 
              value={selectedUpfront?.toString() || ''} 
              onValueChange={(value) => onUpfrontChange(parseInt(value))}
              disabled={availableUpfronts.length <= 1}
            >
              <SelectTrigger size="default" background="primary" className="w-full text-foreground font-medium border-border">
                <SelectValue placeholder="Vælg udbetaling" className="text-foreground" />
              </SelectTrigger>
              <SelectContent>
                {availableUpfronts.map((upfront) => (
                  <PriceImpactSelectItem
                    key={`upfront-${upfront}`}
                    value={upfront.toString()}
                    label={`${upfront.toLocaleString('da-DK')} kr`}
                    impact={upfrontPriceImpacts?.get(upfront)}
                    isSelected={upfront === selectedUpfront}
                    onHover={() => handleUpfrontHover(upfront)}
                    onHoverEnd={handleHoverEnd}
                  />
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

          </>
        )}
      </CardContent>
    </Card>
  )
})

export default LeaseCalculatorCard