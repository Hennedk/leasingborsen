import React, { useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import LeaseOptionCard from './LeaseOptionCard'
import { Label } from '@/components/ui/label'
import { Loader2, AlertTriangle } from 'lucide-react'
import AnimatedPrice from './AnimatedPrice'
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

        {/* Form Fields */}
        <div className="space-y-4">
          {/* Mileage Selection */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-2 block">
              Årligt km-forbrug
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {availableMileages.map((mileage) => (
                <LeaseOptionCard
                  key={`mileage-${mileage}`}
                  value={`${mileage.toLocaleString('da-DK')} km`}
                  label="pr. år"
                  priceImpact={mileagePriceImpacts?.get(mileage)}
                  isSelected={mileage === selectedMileage}
                  onClick={() => onMileageChange(mileage)}
                  className="min-h-[50px]"
                />
              ))}
            </div>
          </div>

          {/* Period Selection */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-2 block">
              Leasingperiode
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {availablePeriods.map((period) => (
                <LeaseOptionCard
                  key={`period-${period}`}
                  value={`${period} mdr`}
                  label="periode"
                  priceImpact={periodPriceImpacts?.get(period)}
                  isSelected={period === selectedPeriod}
                  onClick={() => onPeriodChange(period)}
                  className="min-h-[50px]"
                />
              ))}
            </div>
          </div>

          {/* Upfront Payment Selection */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-2 block">
              Udbetaling
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {availableUpfronts.map((upfront) => (
                <LeaseOptionCard
                  key={`upfront-${upfront}`}
                  value={`${upfront.toLocaleString('da-DK')} kr`}
                  label="udbetaling"
                  priceImpact={upfrontPriceImpacts?.get(upfront)}
                  isSelected={upfront === selectedUpfront}
                  onClick={() => onUpfrontChange(upfront)}
                  className="min-h-[50px]"
                />
              ))}
            </div>
          </div>
        </div>

          </>
        )}
      </CardContent>
    </Card>
  )
})

export default LeaseCalculatorCard