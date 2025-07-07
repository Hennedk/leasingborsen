import React from 'react'
import type { Control, UseFormSetValue, UseFormWatch } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import type { CarListingFormData } from '@/lib/validations'
import type { ReferenceData } from '@/types'
import {
  BasicInfoSection,
  SpecificationsSection,
  MediaSectionWithBackgroundRemoval,
  OffersSection,
  SellerSection
} from './form-sections'
import { JsonPasteSection } from './JsonPasteSection'

interface AdminFormSectionsProps {
  control: Control<CarListingFormData>
  setValue: UseFormSetValue<CarListingFormData>
  watch: UseFormWatch<CarListingFormData>
  referenceData: ReferenceData
  selectedMakeId: string
  currentListingId?: string
  onMakeChange: (makeId: string) => void
  onModelChange: (modelId: string) => void
  onImagesChange: (images: string[]) => void
  onProcessedImagesChange?: (grid: string | null, detail: string | null) => void
  onJsonDataParsed?: (data: any) => void
}

/**
 * AdminFormSections - Renders all form sections in the proper layout
 * Extracted from AdminListingFormNew for better organization
 */
export const AdminFormSections = React.memo<AdminFormSectionsProps>(({
  control,
  setValue,
  watch,
  referenceData,
  selectedMakeId,
  currentListingId,
  onMakeChange,
  onModelChange,
  onImagesChange,
  onProcessedImagesChange,
  onJsonDataParsed
}) => {
  return (
    <>
      {/* JSON Import Section - Collapsible Accordion */}
      <div className="mb-6">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="json-import" className="border rounded-lg">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">JSON Data Import</span>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                  Avanceret
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <JsonPasteSection 
                setValue={setValue}
                onDataParsed={(data) => {
                  // Pass the parsed data (including offers) to parent
                  onJsonDataParsed?.(data)
                }}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* 2/1 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card className="admin-card py-6">
            <CardHeader className="admin-card-header">
              <CardTitle className="admin-section-title">
                Grundoplysninger
                <span className="text-destructive text-sm" aria-label="Påkrævet">*</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="admin-card-content">
              <BasicInfoSection
                control={control}
                referenceData={referenceData}
                selectedMakeId={selectedMakeId}
                onMakeChange={onMakeChange}
                onModelChange={onModelChange}
                setValue={setValue}
              />
            </CardContent>
          </Card>

          {/* Specifications */}
          <Card className="admin-card py-6">
            <CardHeader className="admin-card-header">
              <CardTitle className="admin-section-title">Specifikationer</CardTitle>
            </CardHeader>
            <CardContent className="admin-card-content">
              <SpecificationsSection 
                control={control} 
                fuelType={watch('fuel_type')}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - 1/3 width */}
        <div className="space-y-6">
          {/* Seller */}
          <Card className="shadow-lg border-border/50 py-6">
            <CardHeader className="pb-2 px-6">
              <CardTitle className="flex items-center gap-2 text-lg">
                Sælger
                <span className="text-destructive text-sm" aria-label="Påkrævet">*</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6">
              <SellerSection 
                control={control} 
                setValue={setValue}
              />
            </CardContent>
          </Card>

          {/* Media */}
          <Card className="shadow-lg border-border/50 py-6">
            <CardHeader className="pb-2 px-6">
              <CardTitle className="text-lg">Billeder</CardTitle>
            </CardHeader>
            <CardContent className="px-6">
              <MediaSectionWithBackgroundRemoval 
                control={control}
                onImagesChange={onImagesChange}
                onProcessedImagesChange={onProcessedImagesChange}
                enableBackgroundRemoval={true}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Offers - Full Width Below */}
      <div className="mt-6">
        <Card className="shadow-lg border-border/50 py-6">
          <CardHeader className="pb-2 px-6">
            <CardTitle className="text-lg">Tilbud</CardTitle>
          </CardHeader>
          <CardContent className="px-6">
            <OffersSection 
              control={control}
              currentListingId={currentListingId}
            />
          </CardContent>
        </Card>
      </div>
    </>
  )
})

AdminFormSections.displayName = 'AdminFormSections'