import React from 'react'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
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
    <Drawer 
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DrawerContent className="lg:hidden max-h-[90vh] grid grid-rows-[auto_1fr_auto]">
        <DrawerHeader>
          <DrawerTitle>Tilpas pris</DrawerTitle>
        </DrawerHeader>

        {/* Scrollable Content */}
        <div className="overflow-y-auto overscroll-contain px-4">
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
                  className="h-12 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  <span>💰</span>
                  <span className="font-medium">Billigste</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={onSelectBestScore}
                  className="h-12 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
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
                <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide" vaul-drawer-direction="horizontal">
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
                <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide" vaul-drawer-direction="horizontal">
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
                <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide" vaul-drawer-direction="horizontal">
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