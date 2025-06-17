import React from 'react'
import type { Control } from 'react-hook-form'
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
import { ImageUpload } from '../ImageUpload'

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
      <div className="space-y-6">
        {/* Image Upload */}
        <FormField
          control={control as any}
          name="images"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1">
                Billede
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Upload ét billede af bilen. Dette billede vises på oversigten og detaljesiden.</p>
                  </TooltipContent>
                </Tooltip>
              </FormLabel>
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

        {/* Upload Guidelines */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="text-sm font-medium mb-2">Billedretningslinjer</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Upload ét billede af bilen</li>
            <li>• Billedet vil blive vist på oversigten og detaljesiden</li>
            <li>• Vælg et billede der viser bilen bedst muligt</li>
            <li>• Maksimal filstørrelse: 5MB</li>
            <li>• Understøttede formater: JPG, PNG, WebP</li>
          </ul>
        </div>
      </div>
    </TooltipProvider>
  )
})

MediaSection.displayName = 'MediaSection'