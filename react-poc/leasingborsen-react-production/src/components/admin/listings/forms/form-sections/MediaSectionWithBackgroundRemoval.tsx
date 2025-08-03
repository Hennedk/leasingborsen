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
import { ImageUploadWithBackgroundRemoval } from '@/components/admin/shared/ImageUploadWithBackgroundRemoval'

interface MediaSectionProps {
  control: Control<CarListingFormData>
  onImagesChange: (images: string[]) => void
  enableBackgroundRemoval?: boolean
  onProcessedImagesChange?: (grid: string | null, detail: string | null) => void
}

export const MediaSectionWithBackgroundRemoval = React.memo<MediaSectionProps>(({ 
  control, 
  onImagesChange,
  enableBackgroundRemoval = true,
  onProcessedImagesChange
}) => {
  
  return (
    <TooltipProvider>
      <div className="space-y-3">
        {/* Image Upload with Background Removal */}
        <FormField
          control={control as any}
          name="images"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <ImageUploadWithBackgroundRemoval
                  images={field.value || []}
                  onImagesChange={(images: string[]) => {
                    field.onChange(images)
                    onImagesChange(images)
                  }}
                  maxImages={10}
                  enableBackgroundRemoval={enableBackgroundRemoval}
                  onBackgroundRemovalComplete={(processed, original, gridUrl, detailUrl) => {
                    console.log('Background removed:', { processed, original, gridUrl, detailUrl })
                    // Notify parent component
                    if (onProcessedImagesChange) {
                      onProcessedImagesChange(gridUrl || null, detailUrl || null)
                    }
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

MediaSectionWithBackgroundRemoval.displayName = 'MediaSectionWithBackgroundRemoval'