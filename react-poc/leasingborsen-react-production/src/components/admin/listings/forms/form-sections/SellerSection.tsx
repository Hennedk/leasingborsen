import React from 'react'
import type { Control, UseFormSetValue } from 'react-hook-form'
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { CarListingFormData } from '@/lib/validations'
import { SellerSelect } from '@/components/admin/SellerSelect'

interface SellerSectionProps {
  control: Control<CarListingFormData>
  setValue?: UseFormSetValue<CarListingFormData>
}

export const SellerSection = React.memo<SellerSectionProps>(({ control, setValue }) => {
  return (
    <TooltipProvider>
      <div className="space-y-3">
        {/* Seller Selection */}
        <FormField
          control={control as any}
          name="seller_id"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <SellerSelect
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value)
                    setValue?.('seller_id', value, { shouldDirty: true })
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </TooltipProvider>
  )
})

SellerSection.displayName = 'SellerSection'