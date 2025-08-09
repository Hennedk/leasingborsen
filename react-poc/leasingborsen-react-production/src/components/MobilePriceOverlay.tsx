import React, { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { X, ExternalLink, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import AnimatedPrice from '@/components/listing/AnimatedPrice'
import LeaseOptionCard from '@/components/listing/LeaseOptionCard'
import type { LeaseOption, CarListing, LeaseOptionWithScore } from '@/types'
import type { PriceImpactData, HoveredOption } from '@/types/priceImpact'

interface MobilePriceOverlayProps {
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
  totalCost?: number | null
  isCheapest?: boolean
  priceDifference?: number
  // Price impact props for mobile parity
  mileagePriceImpacts?: Map<number, PriceImpactData>
  periodPriceImpacts?: Map<number, PriceImpactData>
  upfrontPriceImpacts?: Map<number, PriceImpactData>
  onHoverOption?: (option: HoveredOption | null) => void
  // New props for lease scores
  leaseOptionsWithScores?: LeaseOptionWithScore[]
  bestScoreOption?: LeaseOptionWithScore
}

const MobilePriceOverlayComponent: React.FC<MobilePriceOverlayProps> = ({
  isOpen,
  onClose,
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
  totalCost = null,
  isCheapest = false,
  mileagePriceImpacts,
  periodPriceImpacts,
  upfrontPriceImpacts,
  leaseOptionsWithScores = [],
  bestScoreOption
}) => {
  const overlayRef = useRef<HTMLDivElement>(null)
  const firstFocusableRef = useRef<HTMLButtonElement>(null)

  // Focus management and keyboard event handling
  useEffect(() => {
    if (isOpen) {
      // Focus first element when opened
      firstFocusableRef.current?.focus()
      
      // Prevent background scrolling
      document.body.style.overflow = 'hidden'
      
      // Trap focus within overlay and handle keyboard events
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose()
        }
      }
      
      document.addEventListener('keydown', handleKeyDown)
      
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
        document.body.style.overflow = 'unset'
      }
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div 
      className={cn(
        // Layout & positioning
        "fixed inset-0 z-50 overflow-hidden",
        // Responsive
        "lg:hidden"
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="price-overlay-title"
      aria-describedby="price-overlay-description"
    >
      {/* Backdrop */}
      <div 
        className={cn(
          // Positioning
          "absolute inset-0",
          // Styling
          "bg-black/60 backdrop-blur-sm"
        )}
        onClick={onClose}
      />
      
      {/* Slide-up overlay */}
      <div 
        ref={overlayRef}
        className={cn(
          // Positioning
          "absolute bottom-0 left-0 right-0",
          // Layout
          "flex flex-col",
          // Styling
          "bg-background rounded-t-2xl shadow-2xl border-t border-border/50",
          // Animation
          "transform transition-transform duration-300 ease-out translate-y-0",
          // Sizing
          "h-[min(90vh,100dvh-2rem)] max-h-[90vh]"
        )}>
        <div className="flex-1 flex flex-col min-h-0">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-border/50 flex-shrink-0">
            <h3 id="price-overlay-title" className="text-lg font-bold">Tilpas pris</h3>
            <Button
              ref={firstFocusableRef}
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-9 w-9 p-0 hover:bg-muted/50 flex-shrink-0"
              aria-label="Luk prisoverlægning"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="p-5 space-y-6">
              {/* Quick Options Section */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-primary">
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
                <div className="border-b border-border/50 mt-6"></div>
              </div>

              {/* Enhanced Price Display */}
              <div className="space-y-2 pb-4 border-b border-border/50">
                <div className="flex items-baseline gap-2">
                  <AnimatedPrice 
                    value={selectedLease?.monthly_price ?? 0}
                    className="text-3xl font-bold text-primary"
                    showCurrency={true}
                    showPeriod={true}
                  />
                </div>
                
                {/* Total Cost Display */}
                {totalCost && selectedPeriod && (
                  <div className="text-sm text-muted-foreground">
                    <span>I alt: </span>
                    <span className="font-semibold text-foreground">
                      {totalCost.toLocaleString('da-DK')} kr
                    </span>
                    <span> over {selectedPeriod} mdr</span>
                  </div>
                )}
                
                {/* Subtle indicator when cheapest */}
                {isCheapest && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Check className="w-3 h-3" />
                    <span>Billigste konfiguration</span>
                  </div>
                )}
              </div>

              {/* Configuration Options */}
              <div className="space-y-6">
                {/* Mileage Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-primary">
                    Årligt km-forbrug
                  </Label>
                  <div className="grid gap-3">
                    {availableMileages.map((mileage) => {
                      const optionWithScore = leaseOptionsWithScores.find(opt => 
                        opt.mileage_per_year === mileage &&
                        opt.period_months === selectedPeriod &&
                        opt.first_payment === selectedUpfront
                      )
                      
                      return (
                        <LeaseOptionCard
                          key={`mileage-${mileage}`}
                          value={`${mileage.toLocaleString('da-DK')} km/år`}
                          label="Årligt km-forbrug"
                          score={optionWithScore?.lease_score}
                          priceImpact={mileagePriceImpacts?.get(mileage)}
                          isSelected={mileage === selectedMileage}
                          onClick={() => onMileageChange(mileage)}
                        />
                      )
                    })}
                  </div>
                </div>

                {/* Period Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-primary">
                    Leasingperiode
                  </Label>
                  <div className="grid gap-3">
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
                          label="Leasingperiode"
                          score={optionWithScore?.lease_score}
                          priceImpact={periodPriceImpacts?.get(period)}
                          isSelected={period === selectedPeriod}
                          onClick={() => onPeriodChange(period)}
                        />
                      )
                    })}
                  </div>
                </div>

                {/* Upfront Payment Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-primary">
                    Udbetaling
                  </Label>
                  <div className="grid gap-3">
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
                          label="Udbetaling"
                          score={optionWithScore?.lease_score}
                          priceImpact={upfrontPriceImpacts?.get(upfront)}
                          isSelected={upfront === selectedUpfront}
                          onClick={() => onUpfrontChange(upfront)}
                        />
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer - Sticky CTA */}
          <div className={cn(
            // Positioning
            "sticky bottom-0",
            // Layout
            "flex-shrink-0",
            // Styling
            "p-5 border-t border-border/50 bg-background shadow-lg",
            // iOS safe area support
            "pb-[max(1rem,env(safe-area-inset-bottom))]"
          )}>
            <Button 
              className="w-full h-12 gap-2" 
              size="lg"
              onClick={onShowSeller}
            >
              <ExternalLink className="w-4 h-4" />
              Se tilbud
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

const MobilePriceOverlay = React.memo(MobilePriceOverlayComponent)
export default MobilePriceOverlay