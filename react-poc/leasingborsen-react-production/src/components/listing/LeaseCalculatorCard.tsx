import React, { useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectTrigger } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Loader2, AlertTriangle } from 'lucide-react'
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
  isLoading?: boolean
  error?: any
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
  isLoading = false,
  error = null,
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
    <Card className="hidden lg:block bg-card border border-border/50 rounded-xl overflow-hidden sticky top-[90px]">
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

        {/* Grouped Form Fields */}
        <div className="border rounded-xl overflow-hidden bg-white">
          {/* Mileage Selection */}
          <div>
            <Select 
              value={selectedMileage?.toString() || ''} 
              onValueChange={(value) => onMileageChange(parseInt(value))}
              disabled={availableMileages.length <= 1}
            >
              <SelectTrigger className="h-[66px] py-3 px-4 text-left border-0 rounded-none focus:ring-0 focus:ring-offset-0">
                <div className="flex flex-col items-start w-full">
                  <span className="text-xs tracking-wide text-muted-foreground font-medium">
                    Årligt km-forbrug
                  </span>
                  <span className="text-sm font-normal mt-0.5">
                    {selectedMileage ? `${selectedMileage.toLocaleString('da-DK')} km/år` : "Vælg km-forbrug"}
                  </span>
                </div>
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

          {/* Divider */}
          <div className="border-t"></div>

          {/* Period Selection */}
          <div>
            <Select 
              value={selectedPeriod?.toString() || ''} 
              onValueChange={(value) => onPeriodChange(parseInt(value))}
              disabled={availablePeriods.length <= 1}
            >
              <SelectTrigger className="h-[66px] py-3 px-4 text-left border-0 rounded-none focus:ring-0 focus:ring-offset-0">
                <div className="flex flex-col items-start w-full">
                  <span className="text-xs tracking-wide text-muted-foreground font-medium">
                    Leasingperiode
                  </span>
                  <span className="text-sm font-normal mt-0.5">
                    {selectedPeriod ? `${selectedPeriod} måneder` : "Vælg periode"}
                  </span>
                </div>
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

          {/* Divider */}
          <div className="border-t"></div>

          {/* Upfront Payment Selection */}
          <div>
            <Select 
              value={selectedUpfront?.toString() || ''} 
              onValueChange={(value) => onUpfrontChange(parseInt(value))}
              disabled={availableUpfronts.length <= 1}
            >
              <SelectTrigger className="h-[66px] py-3 px-4 text-left border-0 rounded-none focus:ring-0 focus:ring-offset-0">
                <div className="flex flex-col items-start w-full">
                  <span className="text-xs tracking-wide text-muted-foreground font-medium">
                    Udbetaling
                  </span>
                  <span className="text-sm font-normal mt-0.5">
                    {selectedUpfront ? `${selectedUpfront.toLocaleString('da-DK')} kr` : "Vælg udbetaling"}
                  </span>
                </div>
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