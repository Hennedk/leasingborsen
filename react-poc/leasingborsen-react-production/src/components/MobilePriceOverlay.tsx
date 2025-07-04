import React, { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X, RotateCcw, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LeaseOption, CarListing } from '@/types'

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
  onShowSeller
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
            <div className="p-5 space-y-6 relative">
              {/* Reset Button - Top Right Corner */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onResetToCheapest}
                className="absolute top-0 right-0 h-auto px-2 py-1 hover:bg-muted"
                title="Nulstil til laveste pris"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Nulstil
              </Button>

              {/* Price Display */}
              <div className="pr-12">
                <div className="text-3xl font-bold text-primary leading-tight">
                  {selectedLease?.monthly_price?.toLocaleString('da-DK') ?? '–'} kr/md
                </div>
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
                  >
                    <SelectTrigger className="w-full h-12 border-input focus:border-ring">
                      <SelectValue placeholder="Vælg km-forbrug" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMileages.map((mileage) => (
                        <SelectItem key={`mileage-${mileage}`} value={mileage.toString()}>
                          {mileage.toLocaleString('da-DK')} km/år
                        </SelectItem>
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
                  >
                    <SelectTrigger className="w-full h-12 border-input focus:border-ring">
                      <SelectValue placeholder="Vælg periode" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePeriods.map((period) => (
                        <SelectItem key={`period-${period}`} value={period.toString()}>
                          {period} måneder
                        </SelectItem>
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
                  >
                    <SelectTrigger className="w-full h-12 border-input focus:border-ring">
                      <SelectValue placeholder="Vælg udbetaling" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUpfronts.map((upfront) => (
                        <SelectItem key={`upfront-${upfront}`} value={upfront.toString()}>
                          {upfront.toLocaleString('da-DK')} kr
                        </SelectItem>
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