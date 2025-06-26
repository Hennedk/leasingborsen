import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, Users, Car, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { BatchJsonImportSection } from '@/components/admin/listings/forms/BatchJsonImportSection'
import { useBatchListingCreation } from '@/hooks/useBatchListingCreation'
import { Alert, AlertDescription } from '@/components/ui/alert'

/**
 * AdminBatchListings - Page for creating multiple car listings with batch import
 * 
 * Features:
 * - Select one seller for all listings
 * - Import multiple car JSON objects
 * - Real-time progress tracking
 * - Error handling and reporting
 */
const AdminBatchListings: React.FC = () => {
  const navigate = useNavigate()
  const { 
    createBatchListings, 
    progress, 
    error, 
    refreshReferenceDataAndRetry, 
    isReferenceDataError 
  } = useBatchListingCreation()

  const handleBatchSubmit = async (sellerId: string, cars: any[]) => {
    try {
      const result = await createBatchListings(sellerId, cars)
      
      if (result.errors.length > 0) {
        console.error('Batch creation errors:', result.errors)
      }
      
      return result
    } catch (err) {
      console.error('Batch submission error:', err)
      throw err
    }
  }

  const handleCarValidation = (): boolean => {
    // Additional validation logic can be added here
    return true
  }

  const progressPercentage = progress.totalCars > 0 
    ? Math.round((progress.currentCar / progress.totalCars) * 100) 
    : 0

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin/listings')}
              className="px-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Batch Oprettelse af Bil Annoncer</h1>
          </div>
          <p className="text-muted-foreground">
            Opret flere bil annoncer på én gang med samme sælger
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/admin/listings/new')}
          >
            Enkelt Oprettelse
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/admin/listings')}
          >
            Tilbage til Liste
          </Button>
        </div>
      </div>

      {/* Progress Indicator */}
      {progress.isProcessing && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Car className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">Opretter bil annoncer...</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {progress.currentCar} / {progress.totalCars}
                </span>
              </div>
              
              <Progress value={progressPercentage} className="h-2" />
              
              {progress.currentCarName && (
                <p className="text-sm text-muted-foreground">
                  Behandler: <span className="font-medium">{progress.currentCarName}</span>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <div>
              Fejl ved batch oprettelse: {error instanceof Error ? error.message : 'Ukendt fejl'}
            </div>
            {error instanceof Error && isReferenceDataError(error.message) && (
              <div className="mt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={refreshReferenceDataAndRetry}
                  className="text-xs"
                >
                  🔄 Opdater Reference Data og Prøv Igen
                </Button>
                <p className="text-xs mt-1 text-muted-foreground">
                  Det ser ud til at der mangler modeller i cache. Klik for at opdatere.
                </p>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Batch Import Section */}
      <BatchJsonImportSection
        onBatchSubmit={handleBatchSubmit}
        onCarValidated={handleCarValidation}
      />

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Sådan bruges Batch Oprettelse
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <h3 className="font-medium">Vælg Sælger</h3>
              </div>
              <p className="text-sm text-muted-foreground ml-8">
                Vælg den sælger som skal gælde for alle bil annoncer
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <h3 className="font-medium">Import Data</h3>
              </div>
              <p className="text-sm text-muted-foreground ml-8">
                Indsæt JSON data med bil oplysninger (array eller single object)
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <h3 className="font-medium">Opret Alle</h3>
              </div>
              <p className="text-sm text-muted-foreground ml-8">
                Gennemgå parsed data og klik "Opret Alle" for at oprette annoncerne
              </p>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">Vigtige Noter:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Maksimalt 50 biler kan oprettes ad gangen</li>
              <li>Alle biler får samme sælger som valgt</li>
              <li>JSON format er det samme som enkelt import, bare uden seller_id</li>
              <li>Processen kan tage flere minutter afhængigt af antal biler</li>
              <li>Hvis nogle biler fejler, oprettes de resterende stadig</li>
            </ul>
          </div>

          <div className="bg-muted p-3 rounded-md">
            <h4 className="font-medium mb-2">Eksempel JSON Array:</h4>
            <pre className="text-xs overflow-x-auto">
{`[
  {
    "make": "Toyota",
    "model": "Corolla",
    "body_type": "Stationcar",
    "fuel_type": "Hybrid",
    "transmission": "Automatisk",
    "offers": [{"monthly_price": 3999, "period_months": 36}]
  },
  {
    "make": "Volkswagen", 
    "model": "Golf",
    "body_type": "Hatchback",
    "fuel_type": "Benzin",
    "transmission": "Manual",
    "offers": [{"monthly_price": 4599, "period_months": 36}]
  }
]`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AdminBatchListings