import React, { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X, ExternalLink, TrendingDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import AnimatedPrice from '@/components/listing/AnimatedPrice'
import type { LeaseOption, CarListing } from '@/types'
import type { PriceImpactData, HoveredOption } from '@/types/priceImpact'
import PriceImpactSelectItem from '@/components/listing/PriceImpactSelectItem'

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
  onShowSeller: () => void
  totalCost?: number | null
  isCheapest?: boolean
  priceDifference?: number
  // Price impact props for mobile parity
  mileagePriceImpacts?: Map<number, PriceImpactData>
  periodPriceImpacts?: Map<number, PriceImpactData>
  upfrontPriceImpacts?: Map<number, PriceImpactData>
  onHoverOption?: (option: HoveredOption | null) => void
}

const MobilePriceOverlayComponent: React.FC<MobilePriceOverlayProps> = ({
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
  onShowSeller,
  totalCost = null,
  isCheapest = false,
  priceDifference = 0,
  mileagePriceImpacts,
  periodPriceImpacts,
  upfrontPriceImpacts,
  onHoverOption
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

          {/* Car Info */}
          <div className="px-5 py-3 border-b border-border/50 flex-shrink-0">
            <p id="price-overlay-description" className="text-sm text-muted-foreground">
              Tilpas leasingbetingelser for {car.make} {car.model}{car.variant ? ` ${car.variant}` : ''}
            </p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="p-5 space-y-6">
              {/* Subtle price indicator */}
              {!isCheapest && (
                <Button
                  variant="ghost"
                  onClick={onResetToCheapest}
                  className="w-full h-10 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  size="sm"
                >
                  <TrendingDown className="w-3 h-3 mr-1" />
                  Vælg billigste ({priceDifference > 0 ? `-${priceDifference.toLocaleString('da-DK')} kr/md` : 'tilgængelig'})
                </Button>
              )}

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

              {/* Form Fields */}
              <div className="space-y-5">
                {/* Mileage Selection */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-primary">
                    Årligt km-forbrug
                  </Label>
                  <Select 
                    value={selectedMileage?.toString() || ''} 
                    onValueChange={(value) => onMileageChange(parseInt(value))}
                    disabled={availableMileages.length <= 1}
                  >
                    <SelectTrigger className="w-full h-12 border-input focus:border-ring disabled:opacity-50 disabled:cursor-not-allowed">
                      <SelectValue placeholder="Vælg km-forbrug" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[50vh]">
                      {availableMileages.map((mileage) => (
                        <PriceImpactSelectItem
                          key={`mileage-${mileage}`}
                          value={mileage.toString()}
                          label={`${mileage.toLocaleString('da-DK')} km/år`}
                          impact={mileagePriceImpacts?.get(mileage)}
                          isSelected={mileage === selectedMileage}
                          onHover={() => onHoverOption?.({ dimension: 'mileage', value: mileage })}
                          onHoverEnd={() => onHoverOption?.(null)}
                        />
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Period Selection */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-primary">
                    Leasingperiode
                  </Label>
                  <Select 
                    value={selectedPeriod?.toString() || ''} 
                    onValueChange={(value) => onPeriodChange(parseInt(value))}
                    disabled={availablePeriods.length <= 1}
                  >
                    <SelectTrigger className="w-full h-12 border-input focus:border-ring disabled:opacity-50 disabled:cursor-not-allowed">
                      <SelectValue placeholder="Vælg periode" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[50vh]">
                      {availablePeriods.map((period) => (
                        <PriceImpactSelectItem
                          key={`period-${period}`}
                          value={period.toString()}
                          label={`${period} måneder`}
                          impact={periodPriceImpacts?.get(period)}
                          isSelected={period === selectedPeriod}
                          onHover={() => onHoverOption?.({ dimension: 'period', value: period })}
                          onHoverEnd={() => onHoverOption?.(null)}
                        />
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Upfront Payment Selection */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-primary">
                    Udbetaling
                  </Label>
                  <Select 
                    value={selectedUpfront?.toString() || ''} 
                    onValueChange={(value) => onUpfrontChange(parseInt(value))}
                    disabled={availableUpfronts.length <= 1}
                  >
                    <SelectTrigger className="w-full h-12 border-input focus:border-ring disabled:opacity-50 disabled:cursor-not-allowed">
                      <SelectValue placeholder="Vælg udbetaling" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[50vh]">
                      {availableUpfronts.map((upfront) => (
                        <PriceImpactSelectItem
                          key={`upfront-${upfront}`}
                          value={upfront.toString()}
                          label={`${upfront.toLocaleString('da-DK')} kr`}
                          impact={upfrontPriceImpacts?.get(upfront)}
                          isSelected={upfront === selectedUpfront}
                          onHover={() => onHoverOption?.({ dimension: 'upfront', value: upfront })}
                          onHoverEnd={() => onHoverOption?.(null)}
                        />
                      ))}
                    </SelectContent>
                  </Select>
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