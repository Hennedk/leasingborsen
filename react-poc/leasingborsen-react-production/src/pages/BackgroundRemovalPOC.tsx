import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import ListingCard from '@/components/ListingCard'

interface StandardizedImage {
  url: string
  variant: string
  dimensions: string
}

interface ProcessingResult {
  success: boolean
  original?: string
  processed?: string
  standardizedImages?: {
    grid?: StandardizedImage
    detail?: StandardizedImage
  }
  error?: string
}

type ProcessingState = 'idle' | 'uploaded' | 'processing' | 'completed' | 'error'

const BackgroundRemovalPOC: React.FC = () => {
  const [state, setState] = useState<ProcessingState>('idle')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [result, setResult] = useState<ProcessingResult | null>(null)
  const [error, setError] = useState<string>('')

  // Create mock cars data - must be called unconditionally
  const mockCars = useMemo(() => {
    if (!result?.standardizedImages?.grid) return []
    
    return [
      {
        listing_id: 'demo-1',
        make: 'BMW',
        model: '3-serie',
        variant: '320d Touring Sport Line',
        monthly_price: 4500,
        mileage_per_year: 15000,
        first_payment: 35000,
        fuel_type: 'Diesel',
        transmission: 'Automatisk',
        body_type: 'Stationcar',
        horsepower: 190,
        image: result.standardizedImages.grid.url
      },
      {
        listing_id: 'demo-2',
        make: 'Audi',
        model: 'A4',
        variant: '40 TFSI S line',
        monthly_price: 4200,
        mileage_per_year: 20000,
        first_payment: 30000,
        fuel_type: 'Benzin',
        transmission: 'Automatisk',
        body_type: 'Sedan',
        horsepower: 204,
        image: result.standardizedImages.grid.url
      },
      {
        listing_id: 'demo-3',
        make: 'Mercedes-Benz',
        model: 'C-klasse',
        variant: 'C 220 d AMG Line',
        monthly_price: 4800,
        mileage_per_year: 15000,
        first_payment: 40000,
        fuel_type: 'Diesel',
        transmission: 'Automatisk',
        body_type: 'Sedan',
        horsepower: 200,
        image: result.standardizedImages.grid.url
      }
    ]
  }, [result?.standardizedImages?.grid?.url])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }

    setSelectedFile(file)
    setError('')
    setState('uploaded')

    // Create preview URL
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
  }

  const handleConfirmTransformation = async () => {
    if (!selectedFile) return

    setState('processing')
    setError('')
    setResult(null)

    try {
      // Convert file to base64
      const base64 = await fileToBase64(selectedFile)
      
      // Call Supabase Edge Function
      const { data, error: functionError } = await supabase.functions.invoke('remove-bg', {
        body: {
          imageData: base64,
          fileName: selectedFile.name,
        },
      })

      console.log('Function response:', { data, functionError })

      if (functionError) {
        console.error('Function error details:', functionError)
        throw new Error(`Function error: ${functionError.message || JSON.stringify(functionError)}`)
      }

      if (!data) {
        throw new Error('No data returned from function')
      }

      if (!data.success) {
        console.error('Data error:', data)
        throw new Error(data.error || 'Processing failed')
      }

      setResult(data)
      setState('completed')

    } catch (err) {
      console.error('Processing error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      setState('error')
    }
  }

  const handleReset = () => {
    setState('idle')
    setSelectedFile(null)
    setPreviewUrl('')
    setResult(null)
    setError('')
    
    // Clean up preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const getStatusIcon = () => {
    switch (state) {
      case 'uploaded':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'processing':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <Upload className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusText = () => {
    switch (state) {
      case 'uploaded':
        return 'Image uploaded successfully'
      case 'processing':
        return 'Processing image... This may take 10-15 seconds'
      case 'completed':
        return 'Background removal completed'
      case 'error':
        return 'Processing failed'
      default:
        return 'Ready to upload'
    }
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Car Background Removal POC</h1>
          <p className="text-muted-foreground mt-2">
            Test API4.ai background removal service for car images
          </p>
        </div>

        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon()}
              Upload Car Image
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="image-upload">Select Image</Label>
              <Input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={state === 'processing'}
                className="mt-1"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Supported formats: JPG, PNG, WebP. Max size: 10MB
              </p>
            </div>

            <div className="text-sm text-muted-foreground">
              Status: {getStatusText()}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Preview Section */}
        {previewUrl && (
          <Card>
            <CardHeader>
              <CardTitle>Image Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center space-y-4">
                <img
                  src={previewUrl}
                  alt="Upload preview"
                  className="max-w-md max-h-64 object-contain border rounded-lg"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleConfirmTransformation}
                    disabled={state === 'processing' || state === 'completed'}
                    className="flex items-center gap-2"
                  >
                    {state === 'processing' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    Confirm Transformation
                  </Button>
                  <Button variant="outline" onClick={handleReset}>
                    Reset
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Section */}
        {result && state === 'completed' && (
          <>
            {/* Original and Processed Images */}
            <Card>
              <CardHeader>
                <CardTitle>Background Removal Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Original Image */}
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Original</h3>
                    <img
                      src={result.original}
                      alt="Original"
                      className="w-full max-h-64 object-contain border rounded-lg"
                    />
                  </div>

                  {/* Processed Image */}
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Background Removed</h3>
                    <div
                      className="w-full max-h-64 border rounded-lg flex items-center justify-center bg-checkered"
                      style={{
                        backgroundImage: `
                          linear-gradient(45deg, #f0f0f0 25%, transparent 25%),
                          linear-gradient(-45deg, #f0f0f0 25%, transparent 25%),
                          linear-gradient(45deg, transparent 75%, #f0f0f0 75%),
                          linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)
                        `,
                        backgroundSize: '20px 20px',
                        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                      }}
                    >
                      <img
                        src={result.processed}
                        alt="Background removed"
                        className="max-w-full max-h-64 object-contain"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Standardized Images */}
            {result.standardizedImages && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Standardized Sizes</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Automatically resized with transparent background for consistent display
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Grid Size */}
                      {result.standardizedImages.grid && (
                        <div>
                          <h3 className="text-lg font-semibold mb-2">
                            Grid View ({result.standardizedImages.grid.dimensions})
                          </h3>
                          <div
                            className="border rounded-lg p-4"
                            style={{
                              backgroundImage: `
                                linear-gradient(45deg, #f0f0f0 25%, transparent 25%),
                                linear-gradient(-45deg, #f0f0f0 25%, transparent 25%),
                                linear-gradient(45deg, transparent 75%, #f0f0f0 75%),
                                linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)
                              `,
                              backgroundSize: '20px 20px',
                              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                            }}
                          >
                            <img
                              src={result.standardizedImages.grid.url}
                              alt="Grid size"
                              className="w-full h-auto"
                              style={{ maxWidth: '800px' }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Detail Size */}
                      {result.standardizedImages.detail && (
                        <div>
                          <h3 className="text-lg font-semibold mb-2">
                            Detail View ({result.standardizedImages.detail.dimensions})
                          </h3>
                          <div
                            className="border rounded-lg p-4"
                            style={{
                              backgroundImage: `
                                linear-gradient(45deg, #f0f0f0 25%, transparent 25%),
                                linear-gradient(-45deg, #f0f0f0 25%, transparent 25%),
                                linear-gradient(45deg, transparent 75%, #f0f0f0 75%),
                                linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)
                              `,
                              backgroundSize: '20px 20px',
                              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                            }}
                          >
                            <img
                              src={result.standardizedImages.detail.url}
                              alt="Detail size"
                              className="w-full h-auto"
                              style={{ maxWidth: '100%' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button asChild>
                        <a
                          href={result.processed}
                          download={`bg-removed-${selectedFile?.name || 'image'}.png`}
                        >
                          Download Original Processed
                        </a>
                      </Button>
                      {result.standardizedImages.grid && (
                        <Button asChild variant="outline">
                          <a
                            href={result.standardizedImages.grid.url}
                            download={`grid-${selectedFile?.name || 'image'}.png`}
                          >
                            Download Grid Size
                          </a>
                        </Button>
                      )}
                      {result.standardizedImages.detail && (
                        <Button asChild variant="outline">
                          <a
                            href={result.standardizedImages.detail.url}
                            download={`detail-${selectedFile?.name || 'image'}.png`}
                          >
                            Download Detail Size
                          </a>
                        </Button>
                      )}
                      <Button variant="outline" onClick={handleReset}>
                        Process Another Image
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Grid View Demo */}
                {result.standardizedImages.grid && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Grid View Demo - Aktuel Bilvisning</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Sådan vil standardiserede billeder se ud i det faktiske bilgitter
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {mockCars.map((car) => (
                          <div 
                            key={car.listing_id} 
                            onClick={(e) => e.preventDefault()}
                            className="drop-shadow-lg hover:drop-shadow-xl transition-all"
                          >
                            <ListingCard car={car} loading={false} />
                          </div>
                        ))}
                      </div>
                      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground text-center">
                          <strong>Bemærk:</strong> Alle tre biler bruger samme standardiserede billede.
                          I produktion vil hver bil have sit eget unikke billede med samme dimensioner og kvalitet.
                        </p>
                        <p className="text-sm text-muted-foreground text-center mt-2">
                          <strong>Drop shadow:</strong> Implementeret med CSS <code className="bg-muted px-1 rounded">drop-shadow-lg</code> 
                          for optimal ydeevne og fleksibilitet.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Detail Page Hero Demo */}
                {result.standardizedImages.detail && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Detail Page Hero Demo</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Sådan vil standardiserede billeder se ud på bilens detaljeside
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {/* Realistic detail page layout */}
                        <div className="space-y-4">
                          {/* Main image display */}
                          <div className="relative rounded-lg overflow-hidden bg-muted">
                            <img
                              src={result.standardizedImages.detail.url}
                              alt="BMW 3-serie detail view"
                              className="w-full h-[400px] object-contain drop-shadow-2xl"
                            />
                            {/* Gallery indicator */}
                            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                              <div className="w-2 h-2 bg-white/50 rounded-full"></div>
                              <div className="w-2 h-2 bg-white/50 rounded-full"></div>
                              <div className="w-2 h-2 bg-white/50 rounded-full"></div>
                            </div>
                          </div>
                          
                          {/* Car information layout similar to actual detail page */}
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Car details */}
                            <div className="lg:col-span-2 space-y-4">
                              <div>
                                <h1 className="text-3xl font-bold">BMW 3-serie</h1>
                                <p className="text-lg text-muted-foreground">320d Touring Sport Line</p>
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                  <p className="text-sm text-muted-foreground">Brændstof</p>
                                  <p className="font-medium">Diesel</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-sm text-muted-foreground">Transmission</p>
                                  <p className="font-medium">Automatisk</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-sm text-muted-foreground">Hestekræfter</p>
                                  <p className="font-medium">190 hk</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-sm text-muted-foreground">Årgang</p>
                                  <p className="font-medium">2024</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-sm text-muted-foreground">Km/år</p>
                                  <p className="font-medium">15.000 km</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-sm text-muted-foreground">Førstegangsbetaling</p>
                                  <p className="font-medium">35.000 kr</p>
                                </div>
                              </div>
                            </div>
                            
                            {/* Price card */}
                            <div className="bg-card border rounded-lg p-6 space-y-4">
                              <div>
                                <p className="text-sm text-muted-foreground">Månedlig ydelse fra</p>
                                <p className="text-3xl font-bold">4.500 kr/md</p>
                              </div>
                              <Button className="w-full" size="lg">
                                Kontakt forhandler
                              </Button>
                              <Button variant="outline" className="w-full">
                                Beregn leasing
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Alternative background demo */}
                        <div className="relative rounded-lg overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 p-8">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                            <div>
                              <span className="inline-block bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold mb-4">
                                KAMPAGNE
                              </span>
                              <h3 className="text-2xl font-bold mb-2">Særligt tilbud denne måned</h3>
                              <p className="text-muted-foreground mb-4">
                                Få denne BMW 3-serie med ekstra udstyr uden merpris
                              </p>
                              <Button size="lg">Se kampagnedetaljer</Button>
                            </div>
                            <div>
                              <img
                                src={result.standardizedImages.detail.url}
                                alt="Campaign car"
                                className="w-full h-auto"
                              />
                            </div>
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground text-center">
                          Standardiserede billeder med transparent baggrund sikrer ensartet kvalitet
                          og fleksibilitet på tværs af forskellige sektioner og baggrunde
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default BackgroundRemovalPOC