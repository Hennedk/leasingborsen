import React, { useMemo, useCallback } from 'react'
import type { Control, UseFormSetValue } from 'react-hook-form'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { HelpCircle } from 'lucide-react'
import type { CarListingFormData } from '@/lib/validations'
import type { ReferenceData } from '@/types'

interface BasicInfoSectionProps {
  control: Control<CarListingFormData>
  referenceData: ReferenceData
  selectedMakeId: string
  onMakeChange: (makeId: string) => void
  onModelChange: (modelId: string) => void
  setValue?: UseFormSetValue<CarListingFormData>
}

export const BasicInfoSection = React.memo<BasicInfoSectionProps>(({
  control,
  referenceData,
  selectedMakeId,
  onMakeChange,
  onModelChange,
  setValue
}) => {
  // Memoize filtered models based on selected make
  const filteredModels = useMemo(() => 
    selectedMakeId 
      ? referenceData?.models?.filter(model => model.make_id === selectedMakeId) || []
      : referenceData?.models || [],
    [selectedMakeId, referenceData?.models]
  )


  const handleMakeChangeCallback = useCallback((makeId: string) => {
    onMakeChange(makeId)
  }, [onMakeChange])

  const handleModelChangeCallback = useCallback((modelId: string) => {
    onModelChange(modelId)
  }, [onModelChange])

  return (
    <TooltipProvider>
      <div className="admin-form-grid">
          {/* Make */}
        <FormField
          control={control as any}
          name="make"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mærke *</FormLabel>
              <Select 
                value={field.value || ''} 
                onValueChange={(makeName) => {
                  // Find the make by name to get the ID for internal state
                  const make = referenceData?.makes?.find((m: any) => m.name === makeName)
                  if (make) {
                    handleMakeChangeCallback(make.id)
                    field.onChange(makeName)
                  }
                }}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Vælg mærke" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {referenceData?.makes?.map((make: any, index: number) => (
                    <SelectItem key={`make-${make.id || make.name}-${index}`} value={make.name}>
                      {make.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Model */}
        <FormField
          control={control as any}
          name="model"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Model *</FormLabel>
              <Select 
                value={field.value || ''} 
                onValueChange={(modelName) => {
                  // Find the model by name to get the ID for internal state
                  const model = filteredModels.find((m: any) => m.name === modelName)
                  if (model) {
                    handleModelChangeCallback(model.id)
                    field.onChange(modelName)
                  }
                }}
                disabled={!selectedMakeId}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={selectedMakeId ? "Vælg model" : "Vælg først et mærke"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {filteredModels.map((model: any, index: number) => (
                    <SelectItem key={`model-${model.id || model.name}-${selectedMakeId}-${index}`} value={model.name}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Variant */}
        <FormField
          control={control as any}
          name="variant"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1">
                Variant
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>F.eks. "2.0 TDI", "Hybrid", "S-Line"</p>
                  </TooltipContent>
                </Tooltip>
              </FormLabel>
              <FormControl>
                <Input placeholder="f.eks. 2.0 TDI" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Body Type */}
        <FormField
          control={control as any}
          name="body_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Biltype *</FormLabel>
              <Select 
                onValueChange={(value) => {
                  if (setValue) {
                    setValue('body_type', value, { shouldDirty: true })
                  }
                  field.onChange(value)
                }} 
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Vælg biltype" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {referenceData?.bodyTypes?.map((type: any, index: number) => (
                    <SelectItem key={`body-type-${type.id || type.name}-${index}`} value={type.name}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Fuel Type */}
        <FormField
          control={control as any}
          name="fuel_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Brændstoftype *</FormLabel>
              <Select 
                onValueChange={(value) => {
                  if (setValue) {
                    setValue('fuel_type', value, { shouldDirty: true })
                  }
                  field.onChange(value)
                }} 
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Vælg brændstoftype" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {referenceData?.fuelTypes?.map((type: any, index: number) => (
                    <SelectItem key={`fuel-type-${type.id || type.name}-${index}`} value={type.name}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Transmission */}
        <FormField
          control={control as any}
          name="transmission"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gearkasse *</FormLabel>
              <Select 
                onValueChange={(value) => {
                  if (setValue) {
                    setValue('transmission', value, { shouldDirty: true })
                  }
                  field.onChange(value)
                }} 
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Vælg gearkasse" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {referenceData?.transmissions?.map((transmission: any, index: number) => (
                    <SelectItem key={`transmission-${transmission.id || transmission.name}-${index}`} value={transmission.name}>
                      {transmission.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Retail Price */}
        <FormField
          control={control as any}
          name="retail_price"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1">
                Vejledende udsalgspris
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Bilens normale udsalgspris hos forhandler</p>
                    <p className="text-xs mt-1">Bruges til beregning af leasing score</p>
                  </TooltipContent>
                </Tooltip>
              </FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  placeholder="f.eks. 399900"
                  {...field}
                  onChange={(e) => {
                    const value = e.target.value === '' ? '' : e.target.value
                    if (setValue) {
                      setValue('retail_price', value as any, { shouldDirty: true })
                    }
                    field.onChange(value)
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Description - full width */}
        <div className="col-span-full mt-4">
          <FormField
            control={control as any}
            name="description"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="flex items-center gap-1 text-base font-medium">
                  Beskrivelse
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Beskriv bilens tilstand, særlige egenskaber eller fordele</p>
                    </TooltipContent>
                  </Tooltip>
                </FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Beskriv bilen her..."
                    className="min-h-[120px] resize-none"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </TooltipProvider>
  )
})

BasicInfoSection.displayName = 'BasicInfoSection'