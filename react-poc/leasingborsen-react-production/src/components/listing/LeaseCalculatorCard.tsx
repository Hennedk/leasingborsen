import React, { useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectTrigger } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Loader2, AlertTriangle, ExternalLink } from 'lucide-react'
import { LeaseScorePill } from '@/components/ui/LeaseScorePill'
import AnimatedPrice from './AnimatedPrice'
import PriceImpactSelectItem from './PriceImpactSelectItem'
import type { LeaseOption, CarListing } from '@/types'
import type { PriceImpactData, HoveredOption } from '@/types/priceImpact'
import type { InitStatus } from '@/hooks/useLeaseCalculator'
// lease_terms_apply is emitted by router suppression to avoid duplicates

interface LeaseCalculatorCardProps {
  car: CarListing
  selectedLease: LeaseOption | undefined
  selectedLeaseScore?: number
  selectedMileage: number | null
  selectedPeriod: number | null
  selectedUpfront: number | null
  availableMileages: number[]
  availablePeriods: number[]
  availableUpfronts: number[]
  onMileageChange: (value: number) => void
  onPeriodChange: (value: number) => void
  onUpfrontChange: (value: number) => void
  onShowSeller: () => void
  mileagePriceImpacts?: Map<number, PriceImpactData>
  periodPriceImpacts?: Map<number, PriceImpactData>
  upfrontPriceImpacts?: Map<number, PriceImpactData>
  onHoverOption?: (option: HoveredOption | null) => void
  initStatus?: InitStatus
}

const LeaseCalculatorCard = React.memo<LeaseCalculatorCardProps>(({
  car,
  selectedLease,
  selectedLeaseScore,
  selectedMileage,
  selectedPeriod,
  selectedUpfront,
  availableMileages,
  availablePeriods,
  availableUpfronts,
  onMileageChange,
  onPeriodChange,
  onUpfrontChange,
  onShowSeller,
  mileagePriceImpacts,
  periodPriceImpacts,
  upfrontPriceImpacts,
  onHoverOption,
  initStatus = 'pending'
}) => {
  // lease_terms_apply is emitted by router suppression when selected* URL changes
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
  // Handle different initialization states
  if (initStatus === 'loading' || initStatus === 'pending') {
    return (
      <Card className="hidden lg:block bg-card border border-border/50 rounded-xl overflow-hidden sticky top-4">
        <CardContent className="p-5 space-y-4 relative">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Indlæser leasingpriser...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (initStatus === 'empty') {
    return (
      <Card className="hidden lg:block bg-card border border-border/50 rounded-xl overflow-hidden sticky top-4">
        <CardContent className="p-5 space-y-4 relative">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertTriangle className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Ingen leasingpriser tilgængelige for denne bil</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (initStatus === 'error') {
    return (
      <Card className="hidden lg:block bg-card border border-border/50 rounded-xl overflow-hidden sticky top-4">
        <CardContent className="p-5 space-y-4 relative">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertTriangle className="w-6 h-6 text-destructive mx-auto mb-2" />
              <p className="text-sm text-destructive">Der opstod en fejl ved indlæsning af priser</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Only render the full calculator UI when initialized
  return (
    <Card className="hidden lg:block bg-card border border-border/50 rounded-xl overflow-hidden sticky top-4">
      <CardContent className="p-5 space-y-4 relative">
        {/* Content - Show when initialized */}
        {initStatus === 'initialized' && (
          <div className="flex flex-col space-y-6">
            {/* Section 1: Car Title */}
            <div className="space-y-1">
              <h1 className="text-xl md:text-2xl font-bold text-foreground leading-tight">
                {car.make} {car.model}
              </h1>
              {car.variant && (
                <p className="text-sm md:text-base text-foreground">
                  {car.variant}
                </p>
              )}
            </div>

            {/* Section 2: Price + Configuration */}
            <div className="space-y-3">
              {/* Price Display with Lease Score Pill */}
              <div className="flex items-center justify-between">
                <div>
                  <AnimatedPrice 
                    value={selectedLease?.monthly_price ?? 0}
                    className="text-3xl font-bold text-foreground"
                    showCurrency={true}
                    showPeriod={true}
                  />
                </div>
                {/* LeaseScore Pill - positioned horizontally with price */}
                {(selectedLeaseScore !== undefined || car.lease_score !== undefined) && car.retail_price && (
                  <LeaseScorePill 
                    score={selectedLeaseScore ?? car.lease_score!}
                    size="xs"
                    className="border border-border/20 shadow-sm"
                  />
                )}
              </div>

              {/* Grouped Form Fields */}
              <div className="border rounded-xl overflow-hidden bg-white">
          {/* Mileage Selection */}
          <div>
            {availableMileages.length === 1 ? (
              // Read-only field appearance
              <div className="h-[66px] py-3 px-4 border-0 bg-white flex flex-col justify-center">
                <span className="text-xs tracking-wide text-foreground font-medium">
                  Årligt km-forbrug <span className="text-[11px] font-normal opacity-60">· 1 mulighed</span>
                </span>
                <span className="text-sm font-normal mt-0.5">
                  {selectedMileage?.toLocaleString('da-DK')} km/år
                </span>
              </div>
            ) : (
              // Interactive dropdown
              <Select 
                value={selectedMileage?.toString() || ''} 
                onValueChange={(value) => { 
                  const v = parseInt(value); 
                  onMileageChange(v)
                }}
              >
                <SelectTrigger className="h-[66px] py-3 px-4 text-left border-0 rounded-none focus:ring-0 focus:ring-offset-0 bg-white">
                  <div className="flex flex-col items-start w-full">
                    <span className="text-xs tracking-wide text-foreground font-medium">
                      Årligt km-forbrug <span className="text-[11px] font-normal opacity-60">· {availableMileages.length === 1 ? '1 mulighed' : `${availableMileages.length} muligheder`}</span>
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
            )}
          </div>

          {/* Divider */}
          <div className="border-t"></div>

          {/* Period Selection */}
          <div>
            {availablePeriods.length === 1 ? (
              // Read-only field appearance
              <div className="h-[66px] py-3 px-4 border-0 bg-white flex flex-col justify-center">
                <span className="text-xs tracking-wide text-foreground font-medium">
                  Leasingperiode <span className="text-[11px] font-normal opacity-60">· 1 mulighed</span>
                </span>
                <span className="text-sm font-normal mt-0.5">
                  {selectedPeriod} måneder
                </span>
              </div>
            ) : (
              // Interactive dropdown
              <Select 
                value={selectedPeriod?.toString() || ''} 
                onValueChange={(value) => { 
                  const v = parseInt(value); 
                  onPeriodChange(v) 
                }}
              >
                <SelectTrigger className="h-[66px] py-3 px-4 text-left border-0 rounded-none focus:ring-0 focus:ring-offset-0 bg-white">
                  <div className="flex flex-col items-start w-full">
                    <span className="text-xs tracking-wide text-foreground font-medium">
                      Leasingperiode <span className="text-[11px] font-normal opacity-60">· {availablePeriods.length === 1 ? '1 mulighed' : `${availablePeriods.length} muligheder`}</span>
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
            )}
          </div>

          {/* Divider */}
          <div className="border-t"></div>

          {/* Upfront Payment Selection */}
          <div>
            {availableUpfronts.length === 1 ? (
              // Read-only field appearance
              <div className="h-[66px] py-3 px-4 border-0 bg-white flex flex-col justify-center">
                <span className="text-xs tracking-wide text-foreground font-medium">
                  Udbetaling <span className="text-[11px] font-normal opacity-60">· 1 mulighed</span>
                </span>
                <span className="text-sm font-normal mt-0.5">
                  {selectedUpfront?.toLocaleString('da-DK')} kr
                </span>
              </div>
            ) : (
              // Interactive dropdown
              <Select 
                value={selectedUpfront?.toString() || ''} 
                onValueChange={(value) => { 
                  const v = parseInt(value); 
                  onUpfrontChange(v) 
                }}
              >
                <SelectTrigger className="h-[66px] py-3 px-4 text-left border-0 rounded-none focus:ring-0 focus:ring-offset-0 bg-white">
                  <div className="flex flex-col items-start w-full">
                    <span className="text-xs tracking-wide text-foreground font-medium">
                      Udbetaling <span className="text-[11px] font-normal opacity-60">· {availableUpfronts.length === 1 ? '1 mulighed' : `${availableUpfronts.length} muligheder`}</span>
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
            )}
          </div>
              </div>
            </div>

            {/* Section 3: CTA Button */}
            <div>
              <Button 
                className="w-full gap-2" 
                size="default"
                onClick={onShowSeller}
              >
                <ExternalLink className="w-4 h-4" />
                Se tilbud hos leasingselskab
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
})

export default LeaseCalculatorCard
