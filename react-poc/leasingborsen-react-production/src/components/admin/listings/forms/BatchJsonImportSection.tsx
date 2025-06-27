import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Upload, CheckCircle, Users, Car, Trash2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { StandaloneSellerSelect } from '@/components/admin/StandaloneSellerSelect'
import { toast } from 'sonner'
import type { JsonCarData } from './JsonPasteSection'

interface BatchCarData extends Omit<JsonCarData, 'seller_id'> {
  // Remove seller_id since it will be applied globally
}

interface BatchImportState {
  selectedSellerId: string
  jsonInput: string
  parsedCars: BatchCarData[]
  error: string | null
  success: string | null
  isProcessing: boolean
}

interface BatchJsonImportSectionProps {
  onBatchSubmit?: (sellerId: string, cars: BatchCarData[]) => Promise<any>
  onCarValidated?: (car: BatchCarData, index: number) => boolean
}

/**
 * BatchJsonImportSection - Component for creating multiple car listings with one seller
 * 
 * Allows admins to:
 * 1. Select a single seller
 * 2. Import multiple car JSON objects
 * 3. Create all listings with the selected seller
 */
export const BatchJsonImportSection: React.FC<BatchJsonImportSectionProps> = ({ 
  onBatchSubmit,
  onCarValidated 
}) => {
  const [state, setState] = useState<BatchImportState>({
    selectedSellerId: '',
    jsonInput: '',
    parsedCars: [],
    error: null,
    success: null,
    isProcessing: false
  })

  const validateCarData = (car: any, index: number): car is BatchCarData => {
    // Validate required fields
    if (!car.make || !car.model || !car.body_type || !car.fuel_type || !car.transmission) {
      throw new Error(`Bil ${index + 1}: Påkrævede felter mangler (make, model, body_type, fuel_type, transmission)`)
    }
    
    if (!car.offers || !Array.isArray(car.offers) || car.offers.length === 0) {
      throw new Error(`Bil ${index + 1}: Mindst ét tilbud er påkrævet`)
    }
    
    // Validate offers
    for (const [offerIndex, offer] of car.offers.entries()) {
      if (!offer.monthly_price || offer.monthly_price <= 0) {
        throw new Error(`Bil ${index + 1}, Tilbud ${offerIndex + 1}: Gyldig monthly_price er påkrævet`)
      }
    }

    // Call external validation if provided
    if (onCarValidated && !onCarValidated(car, index)) {
      throw new Error(`Bil ${index + 1}: Validering fejlede`)
    }
    
    return true
  }

  const parseJsonArray = (jsonString: string): BatchCarData[] => {
    try {
      const data = JSON.parse(jsonString)
      
      // Handle both single object and array of objects
      const carsArray = Array.isArray(data) ? data : [data]
      
      if (carsArray.length === 0) {
        throw new Error('Ingen bil data fundet')
      }
      
      if (carsArray.length > 50) {
        throw new Error('Maksimalt 50 biler kan importeres ad gangen')
      }
      
      // Validate each car
      const validatedCars: BatchCarData[] = []
      for (const [index, car] of carsArray.entries()) {
        if (validateCarData(car, index)) {
          // Remove seller_id if present since we'll use the global one
          const { seller_id, ...carData } = car as any
          validatedCars.push(carData)
        }
      }
      
      return validatedCars
    } catch (err) {
      throw new Error(`JSON parsing fejl: ${err instanceof Error ? err.message : 'Ukendt fejl'}`)
    }
  }

  const handleParseJson = useCallback(() => {
    setState(prev => ({ ...prev, error: null, success: null }))
    
    if (!state.jsonInput.trim()) {
      setState(prev => ({ ...prev, error: 'Indtast venligst JSON data' }))
      return
    }
    
    try {
      const parsedCars = parseJsonArray(state.jsonInput)
      setState(prev => ({
        ...prev,
        parsedCars,
        success: `${parsedCars.length} bil(er) succesfuldt parset og klar til oprettelse`,
        error: null
      }))
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Ukendt fejl ved parsing',
        parsedCars: []
      }))
    }
  }, [state.jsonInput])

  const handleBatchCreate = async () => {
    if (!state.selectedSellerId) {
      setState(prev => ({ ...prev, error: 'Vælg venligst en sælger først' }))
      return
    }
    
    if (state.parsedCars.length === 0) {
      setState(prev => ({ ...prev, error: 'Ingen biler at oprette' }))
      return
    }
    
    setState(prev => ({ ...prev, isProcessing: true, error: null }))
    
    try {
      if (onBatchSubmit) {
        await onBatchSubmit(state.selectedSellerId, state.parsedCars)
        setState(prev => ({
          ...prev,
          success: `${prev.parsedCars.length} bil(er) succesfuldt oprettet!`,
          parsedCars: [],
          jsonInput: '',
          isProcessing: false
        }))
        toast.success(`${state.parsedCars.length} bil(er) oprettet`, {
          description: 'Alle bil annoncer blev succesfuldt oprettet'
        })
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Fejl ved oprettelse af biler',
        isProcessing: false
      }))
      toast.error('Batch oprettelse fejlede', {
        description: err instanceof Error ? err.message : 'Ukendt fejl'
      })
    }
  }

  const handleRemoveCar = (index: number) => {
    setState(prev => ({
      ...prev,
      parsedCars: prev.parsedCars.filter((_, i) => i !== index)
    }))
  }

  const handleClearAll = () => {
    setState({
      selectedSellerId: state.selectedSellerId, // Keep seller selection
      jsonInput: '',
      parsedCars: [],
      error: null,
      success: null,
      isProcessing: false
    })
  }

  const exampleBatchJson = [
    {
      make: 'Toyota',
      model: 'Corolla',
      variant: 'Hybrid',
      body_type: 'Stationcar',
      fuel_type: 'Hybrid - Petrol',
      transmission: 'Automatic',
      horsepower: 122,
      seats: 5,
      offers: [
        { monthly_price: 3999, period_months: 36, mileage_per_year: 15000 }
      ]
    },
    {
      make: 'Toyota',
      model: 'bZ4X',
      variant: 'Active',
      body_type: 'SUV',
      fuel_type: 'Electric',
      transmission: 'Automatic',
      horsepower: 204,
      seats: 5,
      offers: [
        { monthly_price: 4599, first_payment: 25000, period_months: 36, mileage_per_year: 20000 }
      ]
    }
  ]

  return (
    <Card className="border-2 border-dashed border-primary/25 bg-primary/5">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5" />
          Batch Oprettelse - Flere Biler, Én Sælger
          <Badge variant="secondary" className="text-xs">
            Eksperimentel
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Opret flere bil annoncer på én gang ved at vælge en sælger og importere JSON data for flere biler
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Seller Selection */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">1. Vælg Sælger (gælder for alle biler)</h4>
          <StandaloneSellerSelect
            value={state.selectedSellerId}
            onValueChange={(value) => setState(prev => ({ ...prev, selectedSellerId: value }))}
            required
            label=""
          />
        </div>

        {/* JSON Input */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">2. Indsæt JSON Data (array eller single object)</h4>
          <Textarea
            placeholder="Indsæt JSON array med bil data her..."
            value={state.jsonInput}
            onChange={(e) => setState(prev => ({ ...prev, jsonInput: e.target.value }))}
            rows={12}
            className="font-mono text-sm"
          />
          
          <div className="flex gap-2">
            <Button 
              onClick={handleParseJson}
              disabled={!state.jsonInput.trim() || state.isProcessing}
              size="sm"
              variant="outline"
            >
              <Upload className="h-4 w-4 mr-2" />
              Parse JSON
            </Button>
            
            <Button 
              variant="ghost"
              size="sm"
              onClick={() => setState(prev => ({ ...prev, jsonInput: JSON.stringify(exampleBatchJson, null, 2) }))}
            >
              Brug Eksempel
            </Button>
            
            {(state.jsonInput || state.parsedCars.length > 0) && (
              <Button 
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                disabled={state.isProcessing}
              >
                Ryd Alt
              </Button>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {state.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        {/* Success Alert */}
        {state.success && (
          <Alert className="border-green-200 bg-green-50 text-green-800">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{state.success}</AlertDescription>
          </Alert>
        )}


        {/* Parsed Cars Preview */}
        {state.parsedCars.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Car className="h-4 w-4" />
                3. Parsed Biler ({state.parsedCars.length})
              </h4>
              <Button
                onClick={handleBatchCreate}
                disabled={!state.selectedSellerId || state.isProcessing}
                className="min-w-[120px]"
                title={!state.selectedSellerId ? 'Vælg først en sælger' : state.isProcessing ? 'Opretter...' : 'Opret alle biler med valgte sælger'}
              >
                {state.isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Opretter...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Opret Alle
                  </>
                )}
              </Button>
            </div>
            
            <div className="max-h-64 overflow-y-auto space-y-2 border rounded-md p-3 bg-muted/30">
              {state.parsedCars.map((car, index) => (
                <div key={index} className="flex items-center justify-between bg-background p-3 rounded border">
                  <div className="flex-1">
                    <div className="font-medium">
                      {car.make} {car.model} {car.variant && `(${car.variant})`}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {car.body_type} • {car.fuel_type} • {car.transmission}
                      {car.horsepower && ` • ${car.horsepower} hk`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {car.offers.length} tilbud • Fra {Math.min(...car.offers.map((o: any) => o.monthly_price)).toLocaleString('da-DK')} kr/md
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveCar(index)}
                    disabled={state.isProcessing}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Format Documentation */}
        <div className="space-y-4 text-sm text-muted-foreground">
          <div>
            <h4 className="font-medium text-foreground">JSON Format (samme som single import, men uden seller_id):</h4>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Kan være et array <code>[{}, {}, ...]</code> eller single object <code>{}</code></li>
              <li>Sælger ID bliver automatisk tilføjet fra valget ovenfor</li>
              <li>Maksimalt 50 biler per batch</li>
              <li>Alle biler får samme sælger</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-foreground">📋 Tilladte Værdier (skal matche nøjagtigt):</h4>
            
            <div className="mt-3 space-y-3">
              <div>
                <h5 className="font-medium text-foreground">✅ Toyota Modeller (18 tilgængelige):</h5>
                <div className="mt-1 text-xs font-mono bg-muted/50 p-2 rounded">
                  "Aygo X", "bZ4X", "Camry", "C-HR", "Corolla", "Corolla Cross", "Corolla Touring Sports", "GR86", "GR Supra", "Land Cruiser", "Prius", "Proace City", "Proace City Verso", "Proace Verso", "RAV4", "Urban Cruiser", "Yaris", "Yaris Cross"
                </div>
              </div>

              <div>
                <h5 className="font-medium text-foreground">✅ Karrosseri Typer (9 tilgængelige):</h5>
                <div className="mt-1 text-xs font-mono bg-muted/50 p-2 rounded">
                  "Cabriolet", "Coupe", "Crossover (CUV)", "Hatchback", "Mikro", "Minibus (MPV)", "Sedan", "Stationcar", "SUV"
                </div>
              </div>

              <div>
                <h5 className="font-medium text-foreground">✅ Brændstof Typer (7 tilgængelige):</h5>
                <div className="mt-1 text-xs font-mono bg-muted/50 p-2 rounded">
                  "Diesel", "Electric", "Hybrid - Diesel", "Hybrid - Petrol", "Petrol", "Plug-in - Diesel", "Plug-in - Petrol"
                </div>
              </div>

              <div>
                <h5 className="font-medium text-foreground">✅ Gearkasser (2 tilgængelige):</h5>
                <div className="mt-1 text-xs font-mono bg-muted/50 p-2 rounded">
                  "Automatic", "Manual"
                </div>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                💡 <strong>Tip:</strong> Alle værdier skal matche nøjagtigt (store/små bogstaver, mellemrum, tegn). Hvis en værdi ikke findes, får du en detaljeret fejlbesked med tilgængelige muligheder.
              </div>
              
              <div className="p-2 bg-green-50 border border-green-200 rounded text-xs">
                📝 <strong>Offers Format:</strong> Hvert bil objekt skal have mindst ét tilbud med <code>monthly_price</code>. Andre felter er valgfrie:
                <br/><code>{`"offers": [{"monthly_price": 3999, "first_payment": 0, "period_months": 36, "mileage_per_year": 15000}]`}</code>
                <br/>Hvis <code>first_payment</code> ikke angives, bruges standardværdien 0 kr.
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}