import React, { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Download, 
  Eye,
  RefreshCw,
  Car,
  Zap
} from 'lucide-react'

interface ToyotaExtractedVariant {
  id: string
  type: string
  make: string
  model: string
  variant: string
  engine_specification: string
  monthly_price: number
  first_payment?: number
  total_cost?: number
  power_hp?: number
  battery_capacity_kwh?: number
  drivetrain_type?: string
  powertrain_category?: string
  composite_key: string
  confidence?: number
}

interface ToyotaExtractionResult {
  success: boolean
  items_extracted: number
  items: ToyotaExtractedVariant[]
  metadata: {
    pages_processed: number
    raw_items_found: number
    validated_items: number
    template_version: string
    extraction_method: string
    document_info?: Record<string, unknown>
    extraction_timestamp: string
  }
  errors: string[]
  debug_info?: Record<string, unknown>
}

interface UploadState {
  isDragOver: boolean
  isProcessing: boolean
  progress: number
  progressMessage: string
  error: string | null
  result: ToyotaExtractionResult | null
  file: File | null
  currentStep: string
  railwayUrl: string
}

const ToyotaPDFProcessingPage: React.FC = () => {
  const [state, setState] = useState<UploadState>({
    isDragOver: false,
    isProcessing: false,
    progress: 0,
    progressMessage: '',
    error: null,
    result: null,
    file: null,
    currentStep: '',
    railwayUrl: localStorage.getItem('toyotaRailwayUrl') || ''
  })

  // Save Railway URL to localStorage when changed
  const handleRailwayUrlChange = useCallback((url: string) => {
    const cleanUrl = url.replace(/\/$/, '') // Remove trailing slash
    setState(prev => ({ ...prev, railwayUrl: cleanUrl }))
    localStorage.setItem('toyotaRailwayUrl', cleanUrl)
  }, [])

  // Test Railway connection on mount
  useEffect(() => {
    if (state.railwayUrl) {
      testRailwayConnection()
    }
  }, [state.railwayUrl])

  const testRailwayConnection = async () => {
    try {
      const response = await fetch(state.railwayUrl)
      if (response.ok) {
        const data = await response.json()
        if (data.status === 'healthy') {
          console.log('✅ Railway connection established')
        } else {
          console.log('📡 Railway service responding')
        }
      }
    } catch (error) {
      console.log('Railway service not yet connected')
    }
  }

  const resetState = useCallback(() => {
    setState(prev => ({
      ...prev,
      isDragOver: false,
      isProcessing: false,
      progress: 0,
      progressMessage: '',
      error: null,
      result: null,
      file: null,
      currentStep: ''
    }))
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setState(prev => ({ ...prev, isDragOver: true }))
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setState(prev => ({ ...prev, isDragOver: false }))
  }, [])

  const validateFile = (file: File): string | null => {
    if (file.type !== 'application/pdf') {
      return 'Kun PDF-filer er tilladt'
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB
      return 'Filen er for stor (maksimum 10MB)'
    }
    
    return null
  }

  const handleFile = useCallback(async (file: File) => {
    if (!state.railwayUrl) {
      setState(prev => ({ ...prev, error: 'Please configure Railway URL first' }))
      return
    }

    const validationError = validateFile(file)
    if (validationError) {
      setState(prev => ({ ...prev, error: validationError }))
      return
    }

    setState(prev => ({ 
      ...prev, 
      file,
      error: null,
      isProcessing: true,
      progress: 10,
      progressMessage: 'Uploader Toyota PDF...',
      currentStep: 'Preparing file upload'
    }))

    try {
      // Create FormData for file upload
      const formData = new FormData()
      formData.append('file', file)

      setState(prev => ({ 
        ...prev, 
        progress: 20, 
        progressMessage: 'Sender til Railway for processing...',
        currentStep: 'Connecting to Railway service'
      }))

      // Call Railway template extraction API
      const response = await fetch(`${state.railwayUrl}/extract/template`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Railway extraction failed: ${errorText}`)
      }

      setState(prev => ({ 
        ...prev, 
        progress: 60, 
        progressMessage: 'Processing Toyota variants...',
        currentStep: 'Extracting vehicle data with unique IDs'
      }))

      const result: ToyotaExtractionResult = await response.json()

      setState(prev => ({ 
        ...prev, 
        progress: 90, 
        progressMessage: 'Validating extracted data...',
        currentStep: 'Final validation and unique ID generation'
      }))

      if (!result.success) {
        throw new Error(result.errors?.join(', ') || 'Extraction failed')
      }

      // Complete successfully
      setState(prev => ({
        ...prev,
        isProcessing: false,
        progress: 100,
        progressMessage: 'Toyota extraction completed!',
        currentStep: 'Ready for review',
        result
      }))

      console.log(`Successfully extracted ${result.items_extracted} Toyota variants`)

    } catch (error) {
      console.error('Toyota extraction error:', error)
      setState(prev => ({ 
        ...prev, 
        isProcessing: false,
        progress: 0,
        error: error instanceof Error ? error.message : 'Der opstod en fejl ved behandling af Toyota PDF'
      }))
    }
  }, [state.railwayUrl])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setState(prev => ({ ...prev, isDragOver: false }))
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFile(files[0])
    }
  }, [handleFile])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
  }, [handleFile])

  const downloadResults = useCallback(() => {
    if (!state.result) return

    const dataStr = JSON.stringify(state.result, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    
    const exportFileDefaultName = `toyota_extraction_${new Date().toISOString().split('T')[0]}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }, [state.result])

  const formatVariantStats = (result: ToyotaExtractionResult) => {
    // Check for duplicate IDs
    const allIds = result.items.map(item => item.id)
    const uniqueIds = new Set(allIds)
    const duplicateCount = allIds.length - uniqueIds.size
    
    const stats = {
      electric: result.items.filter(item => item.powertrain_category === 'electric').length,
      hybrid: result.items.filter(item => item.powertrain_category === 'hybrid').length,
      gasoline: result.items.filter(item => item.powertrain_category === 'gasoline').length,
      awd: result.items.filter(item => item.drivetrain_type === 'awd').length,
      priceRange: {
        min: Math.min(...result.items.map(item => item.monthly_price)),
        max: Math.max(...result.items.map(item => item.monthly_price))
      },
      duplicateIds: duplicateCount
    }

    return (
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Electric (BZ4X):</span>
            <Badge variant="default" className="bg-green-100 text-green-800">
              {stats.electric}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Hybrid:</span>
            <Badge variant="default" className="bg-blue-100 text-blue-800">
              {stats.hybrid}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Gasoline:</span>
            <Badge variant="default" className="bg-orange-100 text-orange-800">
              {stats.gasoline}
            </Badge>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">AWD variants:</span>
            <Badge variant="outline">
              {stats.awd}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Price range:</span>
            <Badge variant="outline">
              {stats.priceRange.min.toLocaleString('da-DK')} - {stats.priceRange.max.toLocaleString('da-DK')} DKK
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Unique IDs:</span>
            <Badge variant="default" className="bg-primary/10 text-primary">
              {result.items_extracted}
            </Badge>
          </div>
          {stats.duplicateIds > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Duplicate IDs:</span>
              <Badge variant="destructive">
                {stats.duplicateIds}
              </Badge>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Car className="w-8 h-8 text-red-600" />
            Toyota PDF Processing
          </h1>
          <p className="text-muted-foreground">
            Extract Toyota variants with unique identifiers using Railway template system
          </p>
        </div>
        <Button onClick={resetState} disabled={state.isProcessing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${state.isProcessing ? 'animate-spin' : ''}`} />
          Reset
        </Button>
      </div>

      {/* Railway Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Railway Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="Enter your Railway URL (e.g., https://your-app.railway.app)"
              value={state.railwayUrl}
              onChange={(e) => handleRailwayUrlChange(e.target.value)}
              className="flex-1 px-3 py-2 border border-input rounded-md"
            />
            <Button
              onClick={async () => {
                setState(prev => ({ ...prev, error: null }))
                try {
                  const response = await fetch(state.railwayUrl)
                  if (response.ok) {
                    const data = await response.json()
                    if (data.status === 'healthy') {
                      setState(prev => ({ ...prev, error: '✅ Railway connection successful' }))
                    } else {
                      setState(prev => ({ ...prev, error: '📡 Railway service responding (ready for PDF processing)' }))
                    }
                  } else {
                    setState(prev => ({ ...prev, error: `❌ Connection failed: ${response.status} ${response.statusText}` }))
                  }
                } catch (error) {
                  setState(prev => ({ ...prev, error: '❌ Cannot reach Railway service - check URL' }))
                }
              }}
              variant="outline"
              disabled={!state.railwayUrl}
            >
              Test Connection
            </Button>
          </div>
          {!state.railwayUrl ? (
            <p className="text-sm text-muted-foreground mt-2">
              Railway URL is required for PDF processing
            </p>
          ) : state.error && state.error.includes('✅') ? (
            <p className="text-sm text-green-600 mt-2">
              {state.error}
            </p>
          ) : state.error && state.error.includes('📡') ? (
            <p className="text-sm text-blue-600 mt-2">
              {state.error}
            </p>
          ) : state.error && state.error.includes('❌') ? (
            <p className="text-sm text-red-600 mt-2">
              {state.error}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle>Toyota PDF Upload</CardTitle>
        </CardHeader>
        <CardContent>
          {!state.result && !state.isProcessing && (
            <div
              className={`
                border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
                ${state.isDragOver 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                }
              `}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('toyota-file-upload')?.click()}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-full bg-red-100 p-4">
                  <FileText className="w-8 h-8 text-red-600" />
                </div>
                <div>
                  <p className="font-medium text-lg">Upload Toyota PDF Prisliste</p>
                  <p className="text-sm text-muted-foreground">
                    Træk Toyota dealer PDF her eller klik for at vælge fil
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports all Toyota models with unique variant identification
                  </p>
                </div>
              </div>
              
              <input
                id="toyota-file-upload"
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          )}

          {state.file && !state.result && (
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{state.file.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {(state.file.size / 1024 / 1024).toFixed(1)} MB
                </span>
              </div>
              
              {state.isProcessing && (
                <div className="space-y-2">
                  <Progress value={state.progress} className="w-full" />
                  <p className="text-sm font-medium text-red-600">
                    {state.progressMessage}
                  </p>
                  {state.currentStep && (
                    <p className="text-xs text-muted-foreground">
                      {state.currentStep}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {state.progress}% fuldført
                  </p>
                </div>
              )}
            </div>
          )}

          {state.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {state.result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Toyota Extraction Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium">🎉 Toyota PDF processed successfully!</div>
                <p className="text-sm mt-1">
                  <strong>{state.result.items_extracted} unique Toyota variants</strong> extracted with individual identifiers
                </p>
                <p className="text-sm">
                  Template version: <code className="text-xs bg-muted px-1 rounded">{state.result.metadata.template_version}</code>
                </p>
                <p className="text-sm">
                  Extraction method: <code className="text-xs bg-muted px-1 rounded">{state.result.metadata.extraction_method}</code>
                  <Badge variant="outline" className="ml-2 text-xs">AI Extraction</Badge>
                </p>
                <p className="text-sm">
                  Pages processed: <strong>{state.result.metadata.pages_processed}</strong>
                </p>
              </AlertDescription>
            </Alert>

            {formatVariantStats(state.result)}

            {/* Duplicate ID Warning */}
            {(() => {
              const allIds = state.result.items.map(item => item.id)
              const duplicateIds = allIds.filter((id, index) => allIds.indexOf(id) !== index)
              const uniqueDuplicates = [...new Set(duplicateIds)]
              
              if (uniqueDuplicates.length > 0) {
                return (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-medium">⚠️ Duplicate variant IDs detected</div>
                      <p className="text-sm mt-1">
                        The following IDs appear multiple times: <code>{uniqueDuplicates.join(', ')}</code>
                      </p>
                      <p className="text-xs mt-1">
                        This suggests the unique ID generation needs refinement for some variants.
                      </p>
                    </AlertDescription>
                  </Alert>
                )
              }
              return null
            })()}

            {/* Sample variants preview */}
            <div className="mt-6">
              <h4 className="font-medium mb-3">Sample Extracted Variants:</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {state.result.items.slice(0, 10).map((variant, index) => (
                  <div key={`${variant.id}-${index}`} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                    <div className="flex-1">
                      <span className="font-medium">{variant.make} {variant.model} {variant.variant}</span>
                      <span className="text-muted-foreground ml-2">({variant.power_hp} HP)</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="text-xs">
                        {variant.id}
                      </Badge>
                      <span className="font-medium">{variant.monthly_price.toLocaleString('da-DK')} DKK</span>
                    </div>
                  </div>
                ))}
                {state.result.items.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center">
                    ... and {state.result.items.length - 10} more variants
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button onClick={downloadResults} className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Download Full Results (JSON)
              </Button>
              <Button 
                variant="outline" 
                onClick={() => console.log('Toyota Results:', state.result)}
                className="flex-1"
              >
                <Eye className="w-4 h-4 mr-2" />
                View in Console
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Actions */}
      {state.result && (
        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  <>
                    <div className="font-medium">✅ Toyota AI Extraction Completed!</div>
                    <p className="text-sm mt-1">
                      Extraction completed using {state.result.metadata.extraction_method} with {state.result.metadata.pages_processed} pages processed.
                    </p>
                  </>
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="h-auto p-4 text-left">
                  <div>
                    <div className="font-medium">Import to Database</div>
                    <div className="text-sm text-muted-foreground">
                      Add variants to production listings
                    </div>
                  </div>
                </Button>
                <Button variant="outline" className="h-auto p-4 text-left">
                  <div>
                    <div className="font-medium">Process Another PDF</div>
                    <div className="text-sm text-muted-foreground">
                      Upload additional Toyota dealer PDFs
                    </div>
                  </div>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ToyotaPDFProcessingPage