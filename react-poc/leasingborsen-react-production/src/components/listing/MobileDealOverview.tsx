import React from 'react'
import { Button } from '@/components/ui/button'
import { SlidersHorizontal } from 'lucide-react'

interface MobileDealOverviewProps {
  selectedMileage: number | null
  selectedPeriod: number | null
  selectedUpfront: number | null
  availableMileages: number[]
  availablePeriods: number[]
  availableUpfronts: number[]
  onOpenPriceDrawer: () => void
}

const MobileDealOverview: React.FC<MobileDealOverviewProps> = ({
  selectedMileage,
  selectedPeriod,
  selectedUpfront,
  availableMileages,
  availablePeriods,
  availableUpfronts,
  onOpenPriceDrawer
}) => {
  return (
    <div className="lg:hidden space-y-4">
      {/* Grouped dropdown - read-only, tappable */}
      <div 
        className="border rounded-xl overflow-hidden bg-white cursor-pointer hover:bg-gray-50/50 active:bg-gray-100/50 transition-colors"
        onClick={onOpenPriceDrawer}
        role="button"
        tabIndex={0}
        aria-label="Åbn prisindstillinger"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onOpenPriceDrawer()
          }
        }}
      >
        {/* Annual mileage field */}
        <div className="h-[66px] py-3 px-4 flex flex-col justify-center">
          <span className="text-xs tracking-wide text-foreground font-medium">
            Årligt km-forbrug <span className="text-[11px] font-normal opacity-60">· {availableMileages.length} muligheder</span>
          </span>
          <span className="text-sm font-normal mt-0.5">
            {selectedMileage ? `${selectedMileage.toLocaleString('da-DK')} km/år` : '–'}
          </span>
        </div>
        
        {/* Divider */}
        <div className="border-t"></div>
        
        {/* Lease period field */}
        <div className="h-[66px] py-3 px-4 flex flex-col justify-center">
          <span className="text-xs tracking-wide text-foreground font-medium">
            Leasingperiode <span className="text-[11px] font-normal opacity-60">· {availablePeriods.length} muligheder</span>
          </span>
          <span className="text-sm font-normal mt-0.5">
            {selectedPeriod ? `${selectedPeriod} måneder` : '–'}
          </span>
        </div>
        
        {/* Divider */}
        <div className="border-t"></div>
        
        {/* Down payment field */}
        <div className="h-[66px] py-3 px-4 flex flex-col justify-center">
          <span className="text-xs tracking-wide text-foreground font-medium">
            Udbetaling <span className="text-[11px] font-normal opacity-60">· {availableUpfronts.length} muligheder</span>
          </span>
          <span className="text-sm font-normal mt-0.5">
            {selectedUpfront ? `${selectedUpfront.toLocaleString('da-DK')} kr` : '0 kr'}
          </span>
        </div>
      </div>
      
      {/* Secondary CTA button with white background */}
      <Button 
        variant="outline" 
        className="w-full bg-white"
        onClick={onOpenPriceDrawer}
      >
        <SlidersHorizontal className="h-4 w-4 mr-2" />
        Tilpas pris
      </Button>
    </div>
  )
}

export default MobileDealOverview