import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { ExternalLink, RotateCcw, Loader2, AlertTriangle } from 'lucide-react'
import type { LeaseOption } from '@/types'

interface LeaseCalculatorCardProps {
  selectedLease: LeaseOption | undefined
  selectedMileage: number | null
  selectedPeriod: number | null
  selectedUpfront: number | null
  availableMileages: number[]
  availablePeriods: number[]
  availableUpfronts: number[]
  onMileageChange: (value: number) => void
  onPeriodChange: (value: number) => void
  onUpfrontChange: (value: number) => void
  onResetToCheapest: () => void
  onShowSeller: () => void
  isLoading?: boolean
  error?: any
}

const LeaseCalculatorCard = React.memo<LeaseCalculatorCardProps>(({
  selectedLease,
  selectedMileage,
  selectedPeriod,
  selectedUpfront,
  availableMileages,
  availablePeriods,
  availableUpfronts,
  onMileageChange,
  onPeriodChange,
  onUpfrontChange,
  onResetToCheapest,
  onShowSeller,
  isLoading = false,
  error = null
}) => {
  return (
    <Card className="hidden lg:block bg-card shadow-lg border border-border/50 rounded-xl overflow-hidden sticky top-[90px]">
      <CardContent className="p-5 space-y-4 relative">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Indlæser prisindstillinger...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertTriangle className="w-6 h-6 text-destructive mx-auto mb-2" />
              <p className="text-sm text-destructive">Kunne ikke indlæse prisindstillinger</p>
            </div>
          </div>
        )}

        {/* Content - Only show when not loading and no error */}
        {!isLoading && !error && (
          <>
            {/* Reset Button - Top Right Corner */}
            <Button
          variant="ghost"
          size="sm"
          onClick={onResetToCheapest}
          className="absolute top-3 right-3 h-auto px-2 py-1 hover:bg-muted"
          title="Nulstil til laveste pris"
        >
          <RotateCcw className="w-4 h-4 mr-1" />
          Nulstil
        </Button>

        {/* Monthly Price Display */}
        <div className="pr-12">
          <h3 className="text-3xl font-bold text-primary mb-2">
            {selectedLease?.monthly_price?.toLocaleString('da-DK') ?? '–'} kr/md
          </h3>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          {/* Mileage Selection */}
          <div>
            <Label className="text-sm font-semibold text-primary">
              Årligt km-forbrug
            </Label>
            <Select 
              value={selectedMileage?.toString() || ''} 
              onValueChange={(value) => onMileageChange(parseInt(value))}
            >
              <SelectTrigger className="w-full border-input focus:border-ring">
                <SelectValue placeholder="Vælg km-forbrug" />
              </SelectTrigger>
              <SelectContent>
                {availableMileages.map((mileage) => (
                  <SelectItem key={`mileage-${mileage}`} value={mileage.toString()}>
                    {mileage.toLocaleString('da-DK')} km/år
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Period Selection */}
          <div>
            <Label className="text-sm font-semibold text-primary">
              Leasingperiode
            </Label>
            <Select 
              value={selectedPeriod?.toString() || ''} 
              onValueChange={(value) => onPeriodChange(parseInt(value))}
            >
              <SelectTrigger className="w-full border-input focus:border-ring">
                <SelectValue placeholder="Vælg periode" />
              </SelectTrigger>
              <SelectContent>
                {availablePeriods.map((period) => (
                  <SelectItem key={`period-${period}`} value={period.toString()}>
                    {period} måneder
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Upfront Payment Selection */}
          <div>
            <Label className="text-sm font-semibold text-primary">
              Udbetaling
            </Label>
            <Select 
              value={selectedUpfront?.toString() || ''} 
              onValueChange={(value) => onUpfrontChange(parseInt(value))}
            >
              <SelectTrigger className="w-full border-input focus:border-ring">
                <SelectValue placeholder="Vælg udbetaling" />
              </SelectTrigger>
              <SelectContent>
                {availableUpfronts.map((upfront) => (
                  <SelectItem key={`upfront-${upfront}`} value={upfront.toString()}>
                    {upfront.toLocaleString('da-DK')} kr
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Primary CTA Button */}
        <div className="pt-4">
          <Button 
            className="w-full gap-2" 
            size="lg"
            onClick={onShowSeller}
          >
            <ExternalLink className="w-4 h-4" />
            Se tilbud hos leasingselskab
          </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
})

export default LeaseCalculatorCard