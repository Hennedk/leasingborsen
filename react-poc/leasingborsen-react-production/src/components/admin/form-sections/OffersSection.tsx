import React, { useMemo } from 'react'
import { Info } from 'lucide-react'
import { OffersTableManager } from '../offers'

interface OffersSectionProps {
  control: React.ComponentProps<any>['control']
  currentListingId?: string
}

export const OffersSection = React.memo<OffersSectionProps>(({ 
  currentListingId 
}) => {
  // Memoize whether offers can be edited
  const canEditOffers = useMemo(() => {
    return Boolean(currentListingId)
  }, [currentListingId])

  return (
    <>
      {canEditOffers ? (
        <OffersTableManager
          listingId={currentListingId!}
        />
      ) : (
        <div className="text-center py-8 space-y-2">
          <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
            <Info className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Gem bilen først</h3>
            <p className="text-muted-foreground">
              Du skal først gemme biloplysningerne før du kan tilføje leasingtilbud.
            </p>
          </div>
        </div>
      )}
    </>
  )
})

OffersSection.displayName = 'OffersSection'