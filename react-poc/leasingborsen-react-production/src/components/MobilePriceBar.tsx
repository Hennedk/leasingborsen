import React from 'react'
import { Button } from '@/components/ui/button'
import { Edit3, ExternalLink } from 'lucide-react'

interface LeaseOption {
  mileage_per_year: number
  period_months: number
  first_payment: number
  monthly_price: number
}

interface Car {
  monthly_price?: number
  first_payment?: number
  period_months?: number
  mileage_per_year?: number
}

interface Seller {
  website: string
}

interface MobilePriceBarProps {
  car: Car
  seller: Seller
  selectedLease: LeaseOption | undefined
  onEditPrice: () => void
}

const MobilePriceBarComponent: React.FC<MobilePriceBarProps> = ({
  car,
  seller,
  selectedLease,
  onEditPrice
}) => {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg z-50">
      <div className="p-5 relative">
        {/* Edit Button - Top Right Corner */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onEditPrice}
          className="absolute top-3 right-3 h-9 w-9 p-0 hover:bg-muted/50"
        >
          <Edit3 className="w-4 h-4" />
        </Button>

        {/* Price Information */}
        <div className="mb-5 pr-14">
          <div className="text-2xl font-bold text-primary leading-tight mb-1">
            {selectedLease?.monthly_price?.toLocaleString('da-DK') ?? car.monthly_price?.toLocaleString('da-DK')} kr/md
          </div>
          <div className="text-sm text-muted-foreground leading-relaxed">
            {selectedLease?.first_payment?.toLocaleString('da-DK') ?? car.first_payment?.toLocaleString('da-DK')} kr udbetaling • {selectedLease?.period_months ?? car.period_months} mdr • {selectedLease?.mileage_per_year?.toLocaleString('da-DK') ?? car.mileage_per_year?.toLocaleString('da-DK')} km/år
          </div>
        </div>

        {/* CTA Button */}
        <div>
          <Button 
            className="w-full h-12" 
            size="lg"
            onClick={() => window.open(seller.website, '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Se tilbud
          </Button>
        </div>
      </div>
    </div>
  )
}

const MobilePriceBar = React.memo(MobilePriceBarComponent)
export default MobilePriceBar