import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Upload, CheckCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { CarListingFormData } from '@/lib/validations'
import type { UseFormSetValue } from 'react-hook-form'

export interface JsonCarData {
  // Grundoplysninger (påkrævet)
  make: string
  model: string
  body_type: string
  fuel_type: string
  transmission: string
  
  // Grundoplysninger (valgfrit)
  variant?: string
  year?: number
  horsepower?: number
  seats?: number
  doors?: number
  colour?: string
  description?: string
  
  // Specifikationer (valgfrit)
  mileage?: number
  co2_emission?: number
  co2_tax_half_year?: number
  consumption_l_100km?: number
  consumption_kwh_100km?: number
  wltp?: number
  drive_type?: 'fwd' | 'rwd' | 'awd'
  
  // Sælger (påkrævet)
  seller_id?: string
  
  // Billeder (valgfrit)
  images?: string[]
  
  // Tilbud (påkrævet mindst ét)
  offers: Array<{
    monthly_price: number
    first_payment?: number
    period_months?: number
    mileage_per_year?: number
  }>
}

interface JsonPasteSectionProps {
  setValue: UseFormSetValue<CarListingFormData>
  onDataParsed?: (data: JsonCarData) => void
}

/**
 * JsonPasteSection - Komponent til at indsætte struktureret JSON data
 * 
 * Tillader brugere at indsætte JSON data for automatisk udfyldning af formularen.
 * Validerer JSON struktur og mapper data til form felter.
 */
export const JsonPasteSection: React.FC<JsonPasteSectionProps> = ({ 
  setValue, 
  onDataParsed 
}) => {
  const [jsonInput, setJsonInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  const validateAndParseJson = (jsonString: string): JsonCarData | null => {
    try {
      const data = JSON.parse(jsonString) as JsonCarData
      
      // Valider påkrævede felter
      if (!data.make || !data.model || !data.body_type || !data.fuel_type || !data.transmission) {
        throw new Error('Påkrævede felter mangler: make, model, body_type, fuel_type, transmission')
      }
      
      if (!data.offers || !Array.isArray(data.offers) || data.offers.length === 0) {
        throw new Error('Mindst ét tilbud er påkrævet')
      }
      
      // Valider tilbud
      for (const offer of data.offers) {
        if (!offer.monthly_price || offer.monthly_price <= 0) {
          throw new Error('Alle tilbud skal have en gyldig monthly_price')
        }
      }
      
      return data
    } catch (err) {
      throw new Error(`JSON parsing fejl: ${err instanceof Error ? err.message : 'Ukendt fejl'}`)
    }
  }

  const handlePasteJson = () => {
    setError(null)
    setSuccess(null)
    
    if (!jsonInput.trim()) {
      setError('Indtast venligst JSON data')
      return
    }
    
    try {
      const parsedData = validateAndParseJson(jsonInput)
      
      if (parsedData) {
        // Map JSON data til form felter
        setValue('make', parsedData.make)
        setValue('model', parsedData.model)
        setValue('body_type', parsedData.body_type)
        setValue('fuel_type', parsedData.fuel_type)
        setValue('transmission', parsedData.transmission)
        
        // Valgfrie grundoplysninger
        if (parsedData.variant) setValue('variant', parsedData.variant)
        if (parsedData.horsepower) setValue('horsepower', parsedData.horsepower)
        if (parsedData.seats) setValue('seats', parsedData.seats)
        if (parsedData.doors) setValue('doors', parsedData.doors)
        if (parsedData.description) setValue('description', parsedData.description)
        
        // Specifikationer
        if (parsedData.co2_emission) setValue('co2_emission', parsedData.co2_emission)
        if (parsedData.co2_tax_half_year) setValue('co2_tax_half_year', parsedData.co2_tax_half_year)
        if (parsedData.consumption_l_100km) setValue('consumption_l_100km', parsedData.consumption_l_100km)
        if (parsedData.consumption_kwh_100km) setValue('consumption_kwh_100km', parsedData.consumption_kwh_100km)
        if (parsedData.wltp) setValue('wltp', parsedData.wltp)
        
        // Sælger
        if (parsedData.seller_id) setValue('seller_id', parsedData.seller_id)
        
        // Billeder
        if (parsedData.images && parsedData.images.length > 0) {
          setValue('images', parsedData.images)
        }
        
        setSuccess(`Data succesfuldt indlæst! ${parsedData.offers.length} tilbud klar til import.`)
        setJsonInput('')
        onDataParsed?.(parsedData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ukendt fejl ved parsing af JSON')
    }
  }

  const exampleJson: JsonCarData = {
    make: 'Toyota',
    model: 'Corolla',
    variant: 'Hybrid',
    body_type: 'Stationcar',
    fuel_type: 'Hybrid',
    transmission: 'Automatisk',
    horsepower: 122,
    seats: 5,
    doors: 5,
    colour: 'Hvid',
    co2_emission: 98,
    consumption_l_100km: 4.2,
    description: 'Flot Toyota Corolla Hybrid i perfekt stand',
    seller_id: 'seller-uuid-here',
    images: [
      'https://example.com/car-image-1.jpg',
      'https://example.com/car-image-2.jpg'
    ],
    offers: [
      {
        monthly_price: 3999,
        first_payment: 0,
        period_months: 36,
        mileage_per_year: 15000
      },
      {
        monthly_price: 3599,
        first_payment: 25000,
        period_months: 36,
        mileage_per_year: 15000
      }
    ]
  }

  return (
    <Card className="border-2 border-dashed border-muted-foreground/25 bg-muted/30">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Upload className="h-5 w-5" />
          JSON Data Import
          <Badge variant="secondary" className="text-xs">
            Valgfrit
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Indsæt struktureret JSON data for automatisk udfyldning af formularen
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* JSON Input */}
        <div className="space-y-2">
          <Textarea
            placeholder="Indsæt JSON data her..."
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            rows={8}
            className="font-mono text-sm"
          />
          
          <div className="flex gap-2">
            <Button 
              onClick={handlePasteJson}
              disabled={!jsonInput.trim()}
              size="sm"
            >
              <Upload className="h-4 w-4 mr-2" />
              Importer Data
            </Button>
            
            <Button 
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Skjul' : 'Vis'} Eksempel
            </Button>
            
            {jsonInput && (
              <Button 
                variant="ghost"
                size="sm"
                onClick={() => {
                  setJsonInput('')
                  setError(null)
                  setSuccess(null)
                }}
              >
                Ryd
              </Button>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Alert */}
        {success && (
          <Alert className="border-green-200 bg-green-50 text-green-800">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Example JSON */}
        {isExpanded && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Eksempel JSON Format:</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setJsonInput(JSON.stringify(exampleJson, null, 2))}
              >
                Brug Eksempel
              </Button>
            </div>
            <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto border">
              <code>{JSON.stringify(exampleJson, null, 2)}</code>
            </pre>
          </div>
        )}

        {/* Format Documentation */}
        <div className="space-y-2 text-sm text-muted-foreground">
          <h4 className="font-medium text-foreground">Påkrævede felter:</h4>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><code>make</code>, <code>model</code>, <code>body_type</code>, <code>fuel_type</code>, <code>transmission</code></li>
            <li><code>offers</code> array med mindst ét tilbud (skal indeholde <code>monthly_price</code>)</li>
          </ul>
          
          <h4 className="font-medium text-foreground mt-3">Valgfrie felter:</h4>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Specifikationer: <code>variant</code>, <code>horsepower</code>, <code>seats</code>, <code>doors</code>, <code>colour</code></li>
            <li>Miljø: <code>co2_emission</code>, <code>consumption_l_100km</code>, <code>consumption_kwh_100km</code></li>
            <li>Sælger: <code>seller_id</code></li>
            <li>Billeder: <code>images</code> array med URL'er</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}