import React, { useMemo } from 'react'
import type { Control } from 'react-hook-form'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { HelpCircle } from 'lucide-react'
import type { CarListingFormData } from '@/lib/validations'

interface SpecificationsSectionProps {
  control: Control<CarListingFormData>
  fuelType?: string
}

export const SpecificationsSection = React.memo<SpecificationsSectionProps>(({ control, fuelType }) => {
  // Determine if the fuel type is electric only (not hybrid)
  const isElectric = useMemo(() => {
    if (!fuelType) return false
    const fuelTypeLower = fuelType.toLowerCase()
    // Only show electric fields for pure electric vehicles, not hybrids
    const isElectricVehicle = (fuelTypeLower.includes('electric') || fuelTypeLower.includes('elektrisk')) && 
           !fuelTypeLower.includes('hybrid')
    
    console.log(`🔋 Electric field visibility for fuel type "${fuelType}":`, isElectricVehicle)
    return isElectricVehicle
  }, [fuelType])
  return (
    <TooltipProvider>
      <div className="admin-form-grid">
        {/* Horsepower */}
        <FormField
          control={control as any}
          name="horsepower"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1">
                Hestekræfter
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Motorens effekt i hestekræfter (HK)</p>
                  </TooltipContent>
                </Tooltip>
              </FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  placeholder="f.eks. 150" 
                  min="1"
                  max="2000"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Seats */}
        <FormField
          control={control as any}
          name="seats"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Antal sæder</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  placeholder="f.eks. 5" 
                  min="1"
                  max="20"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Doors */}
        <FormField
          control={control as any}
          name="doors"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Antal døre</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  placeholder="f.eks. 4" 
                  min="2"
                  max="6"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* CO2 Emission */}
        <FormField
          control={control as any}
          name="co2_emission"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1">
                CO₂ udslip
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>CO₂ udslip i gram pr. kilometer (g/km)</p>
                  </TooltipContent>
                </Tooltip>
              </FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  placeholder="f.eks. 120" 
                  min="0"
                  max="800"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* CO2 Tax Half Year */}
        <FormField
          control={control as any}
          name="co2_tax_half_year"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1">
                CO₂ afgift (halv år)
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>CO₂ afgift for 6 måneder i kroner</p>
                  </TooltipContent>
                </Tooltip>
              </FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  placeholder="f.eks. 2500" 
                  min="0"
                  max="50000"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Consumption L/100km - Only for non-electric vehicles */}
        {!isElectric && (
          <FormField
            control={control as any}
            name="consumption_l_100km"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1">
                  Forbrug (L/100km)
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Brændstofforbrug i liter pr. 100 kilometer</p>
                    </TooltipContent>
                  </Tooltip>
                </FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.1"
                    placeholder="f.eks. 6.5" 
                    min="0"
                    max="50"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Consumption kWh/100km - Only for electric vehicles */}
        {isElectric && (
          <FormField
            control={control as any}
            name="consumption_kwh_100km"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1">
                  Forbrug (kWh/100km)
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Elforbrug i kilowatt-timer pr. 100 kilometer</p>
                    </TooltipContent>
                  </Tooltip>
                </FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.1"
                    placeholder="f.eks. 18.5" 
                    min="0"
                    max="100"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* WLTP Range - Only for electric vehicles */}
        {isElectric && (
          <FormField
            control={control as any}
            name="wltp"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1">
                  WLTP rækkevidde
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>WLTP rækkevidde i kilometer</p>
                    </TooltipContent>
                  </Tooltip>
                </FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="f.eks. 400" 
                    min="0"
                    max="2000"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>
    </TooltipProvider>
  )
})

SpecificationsSection.displayName = 'SpecificationsSection'