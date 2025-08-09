import React from 'react'
import { Drawer } from 'vaul'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { X, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import LeaseOptionCard from '@/components/listing/LeaseOptionCard'
import AnimatedPrice from '@/components/listing/AnimatedPrice'

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
  onResetToCheapest,
  onSelectBestScore,
  onShowSeller,
  mileagePriceImpacts,
  periodPriceImpacts,
  upfrontPriceImpacts,
  leaseOptionsWithScores = [],
  bestScoreOption
}) => {
  return (
    <Drawer.Root 
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      modal={true}
      dismissible={true}
      snapPoints={[0.9]} // Allow drawer to snap at 90% height
    >
      <Drawer.Portal>
        <Drawer.Overlay 
          className={cn(
            "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm",
            // Only show on mobile
            "lg:hidden"
          )} 
        />
        <Drawer.Content 
          className={cn(
            // Positioning
            "fixed bottom-0 left-0 right-0 z-50",
            // Layout
            "flex flex-col",
            // Styling
            "bg-background rounded-t-2xl shadow-2xl border-t border-border/50",
            // Sizing - match original overlay
            "max-h-[90vh] h-[min(90vh,100dvh-2rem)]",
            // Only show on mobile
            "lg:hidden"
          )}
        >
          {/* Drag Handle */}
          <div className="mx-auto mt-3 mb-1 flex items-center justify-center">
            <Drawer.Handle className="h-1.5 w-12 rounded-full bg-muted-foreground/40 hover:bg-muted-foreground/60 transition-colors cursor-grab active:cursor-grabbing" />
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border/50 flex-shrink-0">
              <h3 className="text-lg font-bold">Tilpas pris</h3>
              <Drawer.Close asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 hover:bg-muted/50 flex-shrink-0"
                  aria-label="Luk prisoverlægning"
                >
                  <X className="w-4 h-4" />
                </Button>
              </Drawer.Close>
            </div>

            {/* Content - Prevent drawer close on scroll */}
            <div className="flex-1 overflow-y-auto min-h-0" vaul-drawer-direction="none">
              <div className="p-4 space-y-4">
                {/* Quick Options Section */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-muted-foreground">
                    Hurtig valg
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      onClick={onResetToCheapest}
                      className="h-12 flex items-center justify-center gap-2 hover:shadow-md transition-all active:scale-[0.98]"
                    >
                      <span>💰</span>
                      <span className="font-medium">Billigste</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={onSelectBestScore}
                      className="h-12 flex items-center justify-center gap-2 hover:shadow-md transition-all active:scale-[0.98]"
                      disabled={!bestScoreOption}
                    >
                      <span>⭐</span>
                      <span className="font-medium">Bedste score</span>
                    </Button>
                  </div>
                  <div className="border-b border-border/50 mt-4"></div>
                </div>

                {/* Configuration Options */}
                <div className="space-y-4">
                  {/* Lease Period Selection */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-muted-foreground">
                      Leasingperiode
                    </Label>
                    <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
                      {availablePeriods.map((period) => {
                        const optionWithScore = leaseOptionsWithScores.find(opt => 
                          opt.mileage_per_year === selectedMileage &&
                          opt.period_months === period &&
                          opt.first_payment === selectedUpfront
                        )
                        
                        return (
                          <LeaseOptionCard
                            key={`period-${period}`}
                            value={`${period} måneder`}
                            label="Periode"
                            score={optionWithScore?.lease_score}
                            priceImpact={periodPriceImpacts?.get(period)}
                            isSelected={period === selectedPeriod}
                            onClick={() => onPeriodChange(period)}
                            className="flex-shrink-0 w-32 snap-start"
                          />
                        )
                      })}
                    </div>
                  </div>

                  {/* Mileage Selection */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-muted-foreground">
                      Årligt km-forbrug
                    </Label>
                    <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
                      {availableMileages.map((mileage) => {
                        const optionWithScore = leaseOptionsWithScores.find(opt => 
                          opt.mileage_per_year === mileage &&
                          opt.period_months === selectedPeriod &&
                          opt.first_payment === selectedUpfront
                        )
                        
                        return (
                          <LeaseOptionCard
                            key={`mileage-${mileage}`}
                            value={`${mileage.toLocaleString('da-DK')} km`}
                            label="pr. år"
                            score={optionWithScore?.lease_score}
                            priceImpact={mileagePriceImpacts?.get(mileage)}
                            isSelected={mileage === selectedMileage}
                            onClick={() => onMileageChange(mileage)}
                            className="flex-shrink-0 w-32 snap-start"
                          />
                        )
                      })}
                    </div>
                  </div>

                  {/* Upfront Payment Selection */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-muted-foreground">
                      Udbetaling
                    </Label>
                    <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
                      {availableUpfronts.map((upfront) => {
                        const optionWithScore = leaseOptionsWithScores.find(opt => 
                          opt.mileage_per_year === selectedMileage &&
                          opt.period_months === selectedPeriod &&
                          opt.first_payment === upfront
                        )
                        
                        return (
                          <LeaseOptionCard
                            key={`upfront-${upfront}`}
                            value={`${upfront.toLocaleString('da-DK')} kr`}
                            label="udbetaling"
                            score={optionWithScore?.lease_score}
                            priceImpact={upfrontPriceImpacts?.get(upfront)}
                            isSelected={upfront === selectedUpfront}
                            onClick={() => onUpfrontChange(upfront)}
                            className="flex-shrink-0 w-32 snap-start"
                          />
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Footer - Inverted Colors */}
            <div className={cn(
              // Positioning
              "sticky bottom-0",
              // Layout
              "flex-shrink-0",
              // Inverted styling - dark background with light text
              "bg-primary text-primary-foreground border-t border-primary/20 shadow-xl"
            )}>
              {/* Main Content - Inverted colors */}
              <div className="px-5 py-3">
                {/* Price Summary and CTA on same line - Inverted */}
                <div className="flex items-center justify-between gap-4">
                  {/* Left: Current Lease Summary */}
                  <div className="flex-1 min-w-0">
                    <div className="leading-tight mb-1">
                      <AnimatedPrice 
                        value={selectedLease?.monthly_price ?? car.monthly_price ?? 0}
                        className="text-2xl font-bold text-primary-foreground"
                        showCurrency={true}
                        showPeriod={true}
                        animationDuration={300}
                        disableColorChanges={true}
                      />
                    </div>
                    <div className="text-sm text-primary-foreground leading-relaxed truncate flex items-center gap-1">
                      <AnimatedPrice 
                        value={selectedLease?.first_payment ?? car.first_payment ?? 0}
                        className="text-sm text-primary-foreground"
                        showCurrency={true}
                        showPeriod={false}
                        animationDuration={300}
                        disableColorChanges={true}
                      />
                      <span>•</span>
                      <AnimatedPrice 
                        value={selectedLease?.period_months ?? car.period_months ?? 0}
                        className="text-sm text-primary-foreground"
                        showCurrency={false}
                        showPeriod={false}
                        animationDuration={300}
                        disableColorChanges={true}
                      />
                      <span>mdr</span>
                      <span>•</span>
                      <AnimatedPrice 
                        value={selectedLease?.mileage_per_year ?? car.mileage_per_year ?? 0}
                        className="text-sm text-primary-foreground"
                        showCurrency={false}
                        showPeriod={false}
                        animationDuration={300}
                        disableColorChanges={true}
                      />
                      <span>km</span>
                    </div>
                  </div>

                  {/* Right: CTA Button - Inverted to light variant */}
                  <Button 
                    variant="secondary"
                    className="flex-shrink-0 bg-primary-foreground text-primary hover:bg-primary-foreground/90" 
                    size="default"
                    onClick={onShowSeller}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Gå til tilbud
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

export default MobilePriceDrawer