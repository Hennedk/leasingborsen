import React, { useCallback } from 'react'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectTrigger } from '@/components/ui/select'
import { LeaseScorePill } from '@/components/ui/LeaseScorePill'
import PriceImpactSelectItem from '@/components/listing/PriceImpactSelectItem'

import type { LeaseOption, CarListing, LeaseOptionWithScore } from '@/types'
import type { PriceImpactData, HoveredOption } from '@/types/priceImpact'

interface MobilePriceDrawerProps {
  isOpen: boolean
  onClose: () => void
  car: CarListing
  selectedMileage: number | null
  selectedPeriod: number | null
  selectedUpfront: number | null
  selectedLease: LeaseOption | undefined
  availableMileages: number[]
  availablePeriods: number[]
  availableUpfronts: number[]
  onMileageChange: (value: number) => void
  onPeriodChange: (value: number) => void
  onUpfrontChange: (value: number) => void
  onResetToCheapest: () => void
  onSelectBestScore: () => void
  onShowSeller: () => void
  // Price impact props for mobile parity
  mileagePriceImpacts?: Map<number, PriceImpactData>
  periodPriceImpacts?: Map<number, PriceImpactData>
  upfrontPriceImpacts?: Map<number, PriceImpactData>
  onHoverOption?: (option: HoveredOption | null) => void
  // New props for lease scores
  leaseOptionsWithScores?: LeaseOptionWithScore[]
  bestScoreOption?: LeaseOptionWithScore
}

const MobilePriceDrawer: React.FC<MobilePriceDrawerProps> = ({
  isOpen,
  onClose,
  car,
  selectedMileage,
  selectedPeriod,
  selectedUpfront,
  selectedLease,
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
  onHoverOption
}) => {
  // Hover handlers for price impact display
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
    <Drawer 
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DrawerContent className="lg:hidden max-h-[90vh] grid grid-rows-[auto_1fr_auto]">
        <DrawerHeader className="pb-0">
          <DrawerTitle>Tilpas pris</DrawerTitle>
        </DrawerHeader>

        {/* Scrollable Content */}
        <div className="overflow-y-auto overscroll-contain">
          {/* Car Info Section with LeaseScore */}
          <div className="px-4 pt-2 pb-4 border-b">
            <div className="relative">
              <h2 className="text-lg font-bold text-foreground leading-tight">
                {car.make} {car.model}
              </h2>
              {car.variant && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {car.variant}
                </p>
              )}
              
              {/* LeaseScore Pill - positioned to align with title */}
              {car.lease_score && car.retail_price && (
                <LeaseScorePill 
                  score={car.lease_score}
                  size="xs"
                  className="absolute top-0 right-0 border border-border/20 shadow-sm"
                />
              )}
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Configuration Options - Vertical Select Pattern */}
            <div className="space-y-3">
              {/* Grouped Form Fields */}
              <div className="border rounded-xl overflow-hidden bg-white">
                {/* Mileage Selection */}
                <div>
                  {availableMileages.length === 1 ? (
                    // Read-only field appearance
                    <div className="h-[66px] py-3 px-4 border-0 bg-white flex flex-col justify-center">
                      <span className="text-xs tracking-wide text-foreground font-medium">
                        Årligt km-forbrug
                      </span>
                      <span className="text-sm font-normal mt-0.5">
                        {selectedMileage?.toLocaleString('da-DK')} km/år
                      </span>
                    </div>
                  ) : (
                    // Interactive dropdown
                    <Select 
                      value={selectedMileage?.toString() || ''} 
                      onValueChange={(value) => onMileageChange(parseInt(value))}
                    >
                      <SelectTrigger className="h-[66px] py-3 px-4 text-left border-0 rounded-none focus:ring-0 focus:ring-offset-0 bg-white">
                        <div className="flex flex-col items-start w-full">
                          <span className="text-xs tracking-wide text-foreground font-medium">
                            Årligt km-forbrug <span className="text-[11px] font-normal opacity-60">· {availableMileages.length} muligheder</span>
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
                        Leasingperiode
                      </span>
                      <span className="text-sm font-normal mt-0.5">
                        {selectedPeriod} måneder
                      </span>
                    </div>
                  ) : (
                    // Interactive dropdown
                    <Select 
                      value={selectedPeriod?.toString() || ''} 
                      onValueChange={(value) => onPeriodChange(parseInt(value))}
                    >
                      <SelectTrigger className="h-[66px] py-3 px-4 text-left border-0 rounded-none focus:ring-0 focus:ring-offset-0 bg-white">
                        <div className="flex flex-col items-start w-full">
                          <span className="text-xs tracking-wide text-foreground font-medium">
                            Leasingperiode <span className="text-[11px] font-normal opacity-60">· {availablePeriods.length} muligheder</span>
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
                        Udbetaling
                      </span>
                      <span className="text-sm font-normal mt-0.5">
                        {selectedUpfront?.toLocaleString('da-DK')} kr
                      </span>
                    </div>
                  ) : (
                    // Interactive dropdown
                    <Select 
                      value={selectedUpfront?.toString() || ''} 
                      onValueChange={(value) => onUpfrontChange(parseInt(value))}
                    >
                      <SelectTrigger className="h-[66px] py-3 px-4 text-left border-0 rounded-none focus:ring-0 focus:ring-offset-0 bg-white">
                        <div className="flex flex-col items-start w-full">
                          <span className="text-xs tracking-wide text-foreground font-medium">
                            Udbetaling <span className="text-[11px] font-normal opacity-60">· {availableUpfronts.length} muligheder</span>
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
          </div>
        </div>

        <div className="bg-background border-t p-4 space-y-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}>
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              <p className="text-xl font-bold text-foreground leading-none">
                {selectedLease?.monthly_price?.toLocaleString('da-DK')} kr/måned
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground leading-relaxed">
                <span className="font-medium">{selectedMileage?.toLocaleString('da-DK')} km/år</span>
                <span className="text-muted-foreground/50">•</span>
                <span className="font-medium">{selectedPeriod} mdr</span>
                {selectedLease?.first_payment && (
                  <>
                    <span className="text-muted-foreground/50">•</span>
                    <span className="font-medium">Udb: {selectedLease.first_payment.toLocaleString('da-DK')} kr</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <Button 
            size="lg"
            onClick={onShowSeller}
            className="w-full min-h-[44px]"
          >
            Gå til tilbud
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

export default MobilePriceDrawer