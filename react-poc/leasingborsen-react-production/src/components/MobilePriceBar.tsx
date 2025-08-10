import React from 'react'
import { Button } from '@/components/ui/button'
import { ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LeaseOption, CarListing, SellerContact } from '@/types'

interface MobilePriceBarProps {
  car: CarListing
  seller: SellerContact
  selectedLease: LeaseOption | undefined
  onEditPrice: () => void
  onShowSeller: () => void
}

const MobilePriceBarComponent: React.FC<MobilePriceBarProps> = ({
  car,
  selectedLease,
  onEditPrice,
  onShowSeller
}) => {
  return (
    <div 
      className={cn(
        // Positioning
        "fixed bottom-0 left-0 right-0 z-50",
        // Responsive
        "lg:hidden",
        // Styling with animation hint
        "bg-background border-t border-border/50 shadow-xl rounded-t-2xl",
        // Animation
        "transition-transform duration-300 ease-out",
        // Hover effect for desktop testing
        "hover:translate-y-[-2px]"
      )}
    >
      {/* Main Content */}
      <div 
        className="px-5 py-3 cursor-pointer"
        onClick={onEditPrice}
      >
        {/* Price Summary and CTA on same line */}
        <div className="flex items-center justify-between gap-4">
          {/* Left: Current Lease Summary */}
          <div className="flex-1 min-w-0">
            <div className="text-2xl font-bold text-foreground leading-tight mb-1">
              {selectedLease?.monthly_price?.toLocaleString('da-DK') ?? car.monthly_price?.toLocaleString('da-DK')} kr/md
            </div>
            <div className="text-sm text-muted-foreground leading-relaxed truncate">
              {selectedLease?.first_payment?.toLocaleString('da-DK') ?? car.first_payment?.toLocaleString('da-DK')} kr • {selectedLease?.period_months ?? car.period_months} mdr • {selectedLease?.mileage_per_year?.toLocaleString('da-DK') ?? car.mileage_per_year?.toLocaleString('da-DK')} km
            </div>
          </div>

          {/* Right: CTA Button */}
          <Button 
            className="flex-shrink-0" 
            size="default"
            onClick={(e) => {
              e.stopPropagation() // Prevent triggering the edit price when clicking CTA
              onShowSeller()
            }}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Gå til tilbud
          </Button>
        </div>
      </div>
    </div>
  )
}

const MobilePriceBar = React.memo(MobilePriceBarComponent)
export default MobilePriceBar