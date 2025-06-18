import React from 'react'
import type { Control, UseFormSetValue } from 'react-hook-form'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { HelpCircle } from 'lucide-react'
import type { CarListingFormData } from '@/lib/validations'
import { SellerSelect } from '@/components/admin/SellerSelect'

interface SellerSectionProps {
  control: Control<CarListingFormData>
  setValue?: UseFormSetValue<CarListingFormData>
}

export const SellerSection = React.memo<SellerSectionProps>(({ control, setValue }) => {
  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Seller Selection */}
        <FormField
          control={control as any}
          name="seller_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1">
                Sælger *
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Vælg hvilken sælger der skal være ansvarlig for denne bil</p>
                  </TooltipContent>
                </Tooltip>
              </FormLabel>
              <FormControl>
                <SellerSelect
                  value={field.value}
                  onValueChange={(sellerId) => {
                    field.onChange(sellerId)
                    // Also use setValue to ensure form dirty state is triggered
                    if (setValue) {
                      setValue('seller_id', sellerId, { shouldDirty: true })
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Seller Guidelines */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="text-sm font-medium mb-2">Sælger information</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Sælgeren vil være synlig på bilens detaljeside</li>
            <li>• Henvendelser vil blive sendt til sælgerens kontaktoplysninger</li>
            <li>• Sørg for at sælgerens profil er opdateret</li>
            <li>• Kun aktive sælgere vises i listen</li>
          </ul>
        </div>
      </div>
    </TooltipProvider>
  )
})

SellerSection.displayName = 'SellerSection'