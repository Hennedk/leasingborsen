import React from 'react'
import { Button } from '@/components/ui/button'
import { SlidersHorizontal } from 'lucide-react'
import type { LeaseOption } from '@/types'

interface MobileDealOverviewProps {
  selectedMileage: number | null
  selectedPeriod: number | null
  selectedLease: LeaseOption | null
  availableMileages: number[]
  availablePeriods: number[]
  availableUpfronts: number[]
  onOpenPriceDrawer: () => void
}

const MobileDealOverview: React.FC<MobileDealOverviewProps> = ({
  selectedMileage,
  selectedPeriod,
  selectedLease,
  availableMileages,
  availablePeriods,
  availableUpfronts,
  onOpenPriceDrawer
}) => {
  return (
    <div className="lg:hidden space-y-1">
      {/* Section heading */}
      <h3 className="text-lg font-semibold text-foreground">
        Leasingdetaljer
      </h3>

      {/* Specs-like display */}
      <div className="divide-y divide-border">
        {/* Yearly mileage */}
        <div className="flex justify-between py-3">
          <span className="text-sm sm:text-base font-normal text-muted-foreground">
            Inkl. km/år
<span className="ml-2 text-xs text-muted-foreground">
              · {availableMileages.length === 1 ? '1 mulighed' : `${availableMileages.length} muligheder`}
            </span>
          </span>
          <span className="font-medium text-foreground">
            {selectedMileage ? selectedMileage.toLocaleString('da-DK') : '–'}
          </span>
        </div>

        {/* Lease period */}
        <div className="flex justify-between py-3">
          <span className="text-sm sm:text-base font-normal text-muted-foreground">
            Leasingperiode
<span className="ml-2 text-xs text-muted-foreground">
              · {availablePeriods.length === 1 ? '1 mulighed' : `${availablePeriods.length} muligheder`}
            </span>
          </span>
          <span className="font-medium text-foreground">
            {selectedPeriod ? `${selectedPeriod} mdr` : '–'}
          </span>
        </div>

        {/* First payment */}
        <div className="flex justify-between py-3">
          <span className="text-sm sm:text-base font-normal text-muted-foreground">
            Udbetaling
<span className="ml-2 text-xs text-muted-foreground">
              · {availableUpfronts.length === 1 ? '1 mulighed' : `${availableUpfronts.length} muligheder`}
            </span>
          </span>
          <span className="font-medium text-foreground">
            {selectedLease?.first_payment ? `${selectedLease.first_payment.toLocaleString('da-DK')} kr` : '0 kr'}
          </span>
        </div>

        {/* Total cost */}
        {selectedLease && selectedPeriod && (
          <div className="flex justify-between py-3">
            <span className="text-sm sm:text-base font-normal text-muted-foreground">Samlet pris i perioden</span>
            <span className="font-medium text-foreground">
              {(() => {
                const totalCost = (selectedLease.monthly_price * selectedPeriod) + (selectedLease.first_payment || 0)
                return `${totalCost.toLocaleString('da-DK')} kr`
              })()}
            </span>
          </div>
        )}
      </div>
      
      {/* CTA button - only show if options exist */}
      {(availableMileages.length > 1 || availablePeriods.length > 1 || availableUpfronts.length > 1) && (
        <div>
          <Button 
            variant="outline" 
            className="w-full bg-surface-brand hover:bg-surface-brand-hover border-surface-brand/50 text-foreground font-medium"
            onClick={onOpenPriceDrawer}
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Tilpas pris
          </Button>
        </div>
      )}
    </div>
  )
}

export default MobileDealOverview