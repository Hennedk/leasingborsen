import React from 'react'
import type { Control } from 'react-hook-form'
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { CarListingFormData } from '@/lib/validations'
import { ImageUpload } from '@/components/admin/ImageUpload'

interface MediaSectionProps {
  control: Control<CarListingFormData>
  onImagesChange: (images: string[]) => void
}

export const MediaSection = React.memo<MediaSectionProps>(({ 
  control, 
  onImagesChange 
}) => {
  return (
    <TooltipProvider>
      <div className="space-y-3">
        {/* Image Upload */}
        <FormField
          control={control as any}
          name="images"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <ImageUpload
                  images={field.value || []}
                  onImagesChange={(images) => {
                    field.onChange(images)
                    onImagesChange(images)
                  }}
                  maxImages={1}
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

MediaSection.displayName = 'MediaSection'