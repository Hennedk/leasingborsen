import React, { useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
// import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, FileText, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { pdfTextExtractor } from '@/lib/services/pdfTextExtractor'
import { useNavigate } from 'react-router-dom'
// import { supabase } from '@/lib/supabase'
import { useJobProgress } from '@/hooks/useJobProgress'

interface ProcessingJobResult {
  batchId: string
  jobId: string
  itemsCreated: number
  stats: {
    new: number
    updated: number
    removed: number
    total_processed: number
  }
  dealerDetection?: {
    detectedType: string
    confidence: number
    method: string
  }
}

interface GenericBatchUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sellerId: string
  sellerName: string
  suggestedDealer?: 'volkswagen' | 'toyota' | 'auto-detect'
  onUploadComplete?: (result: ProcessingJobResult) => void
}

interface UploadState {
  isDragOver: boolean
  isProcessing: boolean
  progress: number
  progressMessage: string
  error: string | null
  result: ProcessingJobResult | null
  file: File | null
  aiSpending: number
  jobId: string | null
  currentStep: string
  selectedDealer: 'volkswagen' | 'toyota' | 'auto-detect'
}

export const GenericBatchUploadDialog = React.memo<GenericBatchUploadDialogProps>(({
  open,
  onOpenChange,
  sellerId,
  sellerName,
  suggestedDealer = 'auto-detect',
  // onUploadComplete
}) => {
  const navigate = useNavigate()
  const [state, setState] = useState<UploadState>({
    isDragOver: false,
    isProcessing: false,
    progress: 0,
    progressMessage: '',
    error: null,
    result: null,
    file: null,
    aiSpending: 0,
    jobId: null,
    currentStep: '',
    selectedDealer: suggestedDealer
  })

  // Monitor job progress
  const { startPolling } = useJobProgress(state.jobId || '', {
    autoStart: false, // We'll start manually when jobId is set
    onCompleted: (job) => {
      setState(prev => ({
        ...prev,
        isProcessing: false,
        progress: 100,
        progressMessage: 'Processing completed successfully!',
        result: {
          batchId: job.batchId,
          jobId: job.id,
          itemsCreated: job.itemsProcessed || 0,
          stats: { 
            new: job.itemsProcessed || 0, 
            updated: 0, 
            removed: 0,
            total_processed: job.itemsProcessed || 0 
          }
        }
      }))
    },
    onFailed: (job) => {
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: job.errorMessage || 'Processing failed',
        progress: 0
      }))
    },
    onProgress: (job) => {
      setState(prev => ({
        ...prev,
        progress: job.progress,
        progressMessage: job.currentStep || 'Processing...',
        currentStep: job.currentStep || ''
      }))
    }
  })

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setState(prev => ({ ...prev, isDragOver: true }))
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setState(prev => ({ ...prev, isDragOver: false }))
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setState(prev => ({ ...prev, isDragOver: false }))
    
    const files = Array.from(e.dataTransfer.files)
    const pdfFile = files.find(file => file.type === 'application/pdf')
    
    if (pdfFile) {
      handleFile(pdfFile)
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      handleFile(file)
    }
  }, [])

  const handleFile = useCallback((file: File) => {
    setState(prev => ({
      ...prev,
      file,
      error: null,
      result: null
    }))
  }, [])

  const processPDF = useCallback(async () => {
    if (!state.file) return

    setState(prev => ({
      ...prev,
      isProcessing: true,
      progress: 0,
      progressMessage: 'Extracting text from PDF...',
      error: null,
      currentStep: 'extract'
    }))

    try {
      // Create a unique batch ID
      const batchId = `batch-${Date.now()}-${sellerId}`
      
      // Extract text from PDF using client-side PDF.js
      setState(prev => ({
        ...prev,
        progress: 10,
        progressMessage: 'Loading PDF for text extraction...',
        currentStep: 'extract'
      }))

      const extractionResult = await pdfTextExtractor.extractText(state.file)
      const extractedText = extractionResult.text
      
      setState(prev => ({
        ...prev,
        progress: 40,
        progressMessage: 'Text extracted, sending to server...',
        currentStep: 'process'
      }))

      // Call the Edge Function to process the extracted text
      const dealerConfig = state.selectedDealer === 'auto-detect' 
        ? {} 
        : { dealerId: state.selectedDealer }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-pdf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          batchId,
          extractedText,
          filename: state.file.name,
          sellerId,
          ...dealerConfig
        })
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error || 'Failed to process extracted text')
      }

      const responseData = await response.json()
      
      // Store the job ID for progress monitoring
      setState(prev => ({
        ...prev,
        jobId: responseData.jobId,
        progress: 50,
        progressMessage: 'Server processing started, monitoring progress...'
      }))

      // Start polling for progress updates
      if (responseData.jobId) {
        startPolling(responseData.jobId)
      }

    } catch (error) {
      console.error('Error processing PDF:', error)
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: error instanceof Error ? error.message : 'Failed to process PDF'
      }))
    }
  }, [state.file, state.selectedDealer, sellerId])

  const handleReset = useCallback(() => {
    setState({
      isDragOver: false,
      isProcessing: false,
      progress: 0,
      progressMessage: '',
      error: null,
      result: null,
      file: null,
      aiSpending: 0,
      jobId: null,
      currentStep: '',
      selectedDealer: suggestedDealer
    })
  }, [suggestedDealer])

  const handleViewBatch = useCallback(() => {
    if (state.result?.batchId) {
      navigate(`/admin/batches/${state.result.batchId}/review`)
      onOpenChange(false)
    }
  }, [state.result, navigate, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Batch Upload - {sellerName}</DialogTitle>
          <DialogDescription>
            Upload a PDF price list to extract vehicle information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Dealer Selection */}
          {!state.isProcessing && !state.result && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Dealer Type</label>
              <Select 
                value={state.selectedDealer} 
                onValueChange={(value: any) => setState(prev => ({ ...prev, selectedDealer: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto-detect">
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Auto-Detect Dealer
                    </div>
                  </SelectItem>
                  <SelectItem value="volkswagen">Volkswagen Group (VW, Audi, SEAT, Škoda)</SelectItem>
                  <SelectItem value="toyota">Toyota / Lexus</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Auto-detect will analyze the PDF to determine the dealer type automatically
              </p>
            </div>
          )}

          {/* File Upload Area */}
          {!state.file && !state.isProcessing && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-colors duration-200
                ${state.isDragOver 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
                }
              `}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-medium mb-2">
                Drag and drop your PDF here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Supports dealer price lists in PDF format
              </p>
              <input
                id="file-input"
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          )}

          {/* Selected File */}
          {state.file && !state.isProcessing && !state.result && (
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">{state.file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(state.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                >
                  Change File
                </Button>
                <Button
                  size="sm"
                  onClick={processPDF}
                >
                  Process PDF
                </Button>
              </div>
            </div>
          )}

          {/* Processing Progress */}
          {state.isProcessing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{state.progressMessage}</span>
                  <span>{Math.round(state.progress)}%</span>
                </div>
                <Progress value={state.progress} className="h-2" />
              </div>
              
              {state.currentStep && (
                <div className="text-sm text-muted-foreground">
                  Current step: {state.currentStep}
                </div>
              )}

              {state.jobId && (
                <div className="text-xs text-muted-foreground">
                  Job ID: {state.jobId}
                </div>
              )}

              {/* TODO: Add dealer detection display when job monitoring is implemented */}
            </div>
          )}

          {/* Error Message */}
          {state.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          {/* Success Result */}
          {state.result && (
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {state.selectedDealer === 'toyota' 
                    ? `Toyota PDF processing completed successfully! ${state.result.itemsCreated || 0} items extracted using regex patterns`
                    : `Successfully processed ${state.result.stats?.new || 0} vehicles`
                  }
                </AlertDescription>
              </Alert>

              {state.selectedDealer === 'toyota' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      {state.result.itemsCreated || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Items Extracted</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">
                      Pattern
                    </p>
                    <p className="text-sm text-muted-foreground">Method</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      {state.result.stats?.new || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">New Vehicles</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">
                      {state.result.stats?.updated || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Updated</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">
                      {state.result.stats?.removed || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Removed</p>
                  </div>
                </div>
              )}

              {state.result.dealerDetection && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Info className="h-4 w-4" />
                  <span>
                    Processed as: <strong>{state.result.dealerDetection.detectedType}</strong> 
                    ({state.result.dealerDetection.confidence}% confidence, {state.result.dealerDetection.method})
                  </span>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={handleReset}
                >
                  Upload Another
                </Button>
                {state.selectedDealer === 'toyota' ? (
                  <Button onClick={handleReset}>
                    Extract Another PDF
                  </Button>
                ) : (
                  <Button onClick={handleViewBatch}>
                    Review Batch
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
})

GenericBatchUploadDialog.displayName = 'GenericBatchUploadDialog'