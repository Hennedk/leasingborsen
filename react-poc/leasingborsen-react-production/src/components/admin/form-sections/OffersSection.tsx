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
    <TooltipProvider>
      <Card>
        <CardHeader className="pt-6 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Leasingtilbud
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Administrer leasingtilbud for denne bil</p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 px-6 pb-6">
          {canEditOffers ? (
            <div className="space-y-4">
              <FormField
                control={control as any}
                name="offers"
                render={() => (
                  <FormItem>
                    <FormLabel>Tilbud</FormLabel>
                    <FormControl>
                      <OffersTableManager
                        listingId={currentListingId!}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          ) : (
            <div className="text-center py-8 space-y-4">
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

          {/* Offers Guidelines */}
          {canEditOffers && (
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="text-sm font-medium mb-2">Tilbudsretningslinjer</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Tilføj forskellige leasingperioder og kilometerantal</li>
                <li>• Sørg for konkurrencedygtige månedlige priser</li>
                <li>• Inkluder relevante udbetaling og perioder</li>
                <li>• Tilbud bliver vist på bilens detaljeside</li>
                <li>• Minimum ét tilbud er påkrævet for publicering</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  )
})

OffersSection.displayName = 'OffersSection'