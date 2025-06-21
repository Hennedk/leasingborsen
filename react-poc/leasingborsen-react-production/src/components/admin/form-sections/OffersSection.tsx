import React, { useMemo } from 'react'
import type { Control } from 'react-hook-form'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { HelpCircle, Info } from 'lucide-react'
import type { CarListingFormData } from '@/lib/validations'
import { OffersTableManager } from '../offers'

interface OffersSectionProps {
  control: Control<CarListingFormData>
  currentListingId?: string
}

export const OffersSection = React.memo<OffersSectionProps>(({ 
  control, 
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