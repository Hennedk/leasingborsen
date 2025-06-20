import React, { useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react'
import { VWPDFProcessor, type BatchProcessingResult } from '@/lib/processors/vwPDFProcessor'
import { PDFTextExtractor } from '@/lib/services/pdfTextExtractor'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

interface VWBatchUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sellerId: string
  sellerName: string
  onUploadComplete?: (result: BatchProcessingResult) => void
}

interface UploadState {
  isDragOver: boolean
  isProcessing: boolean
  progress: number
  progressMessage: string
  error: string | null
  result: BatchProcessingResult | null
  file: File | null
  aiSpending: number
}

export const VWBatchUploadDialog: React.FC<VWBatchUploadDialogProps> = ({
  open,
  onOpenChange,
  sellerId,
  sellerName,
  onUploadComplete
}) => {
  const [state, setState] = useState<UploadState>({
    isDragOver: false,
    isProcessing: false,
    progress: 0,
    progressMessage: '',
    error: null,
    result: null,
    file: null,
    aiSpending: 0
  })

  const processor = new VWPDFProcessor()
  const navigate = useNavigate()

  // Fetch current AI spending when dialog opens
  React.useEffect(() => {
    if (open) {
      fetchAISpending()
    }
  }, [open])

  const fetchAISpending = async () => {
    try {
      const { data, error } = await supabase.rpc('get_current_month_ai_spending')
      if (error) throw error
      setState(prev => ({ ...prev, aiSpending: data || 0 }))
    } catch (error) {
      console.error('Failed to fetch AI spending:', error)
    }
  }

  const resetState = useCallback(() => {
    setState({
      isDragOver: false,
      isProcessing: false,
      progress: 0,
      progressMessage: '',
      error: null,
      result: null,
      file: null,
      aiSpending: 0
    })
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
    // Use PDF extractor validation
    if (!PDFTextExtractor.isValidPDF(file)) {
      return 'Kun PDF-filer er tilladt'
    }
    
    // Check file size using PDF extractor limits
    const limits = PDFTextExtractor.getFileSizeLimits()
    if (file.size > limits.maxSize) {
      return `Filen er for stor (maksimum ${Math.round(limits.maxSize / 1024 / 1024)}MB)`
    }
    
    // Optional: Check filename for VW content (can be removed for flexibility)
    if (!file.name.toLowerCase().includes('volkswagen') && 
        !file.name.toLowerCase().includes('vw') && 
        !file.name.toLowerCase().includes('leasing')) {
      console.warn('⚠️ File name does not contain VW/Volkswagen/leasing - proceeding anyway')
    }
    
    return null
  }

  const handleFile = async (file: File) => {
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
      progressMessage: 'Validerer PDF fil...'
    }))

    try {
      // Progress tracking with realistic stages
      const updateProgress = (progress: number, message: string) => {
        setState(prev => ({ ...prev, progress, progressMessage: message }))
      }

      updateProgress(20, 'Uploader fil til storage...')
      
      // Small delay to show progress
      await new Promise(resolve => setTimeout(resolve, 500))
      
      updateProgress(40, 'Ekstraherer tekst fra PDF...')
      
      const result = await processor.processPDF(sellerId, file, 'admin')
      
      updateProgress(90, 'Færdiggør batch processing...')
      
      // Final completion
      setState(prev => ({ 
        ...prev, 
        isProcessing: false,
        progress: 100,
        progressMessage: 'Fuldført!',
        result
      }))

      // Update AI spending after successful upload
      fetchAISpending()
      
      onUploadComplete?.(result)
      
      // Auto-navigate to review page after successful upload
      setTimeout(() => {
        if (result.batchId) {
          navigate(`/admin/batch/${result.batchId}/review`)
          handleClose() // Close the modal after navigation
        }
      }, 1000) // Small delay to show the success state briefly

    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isProcessing: false,
        progress: 0,
        error: error instanceof Error ? error.message : 'Der opstod en fejl ved behandling af filen'
      }))
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setState(prev => ({ ...prev, isDragOver: false }))
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFile(files[0])
    }
  }, [sellerId, onUploadComplete])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
  }, [sellerId, onUploadComplete])

  const handleClose = () => {
    if (!state.isProcessing) {
      resetState()
      onOpenChange(false)
    }
  }

  const formatStats = (stats: any) => {
    if (!stats) return null
    
    return (
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Nye listings:</span>
            <Badge variant="default" className="bg-green-100 text-green-800">
              {stats.new}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Opdateringer:</span>
            <Badge variant="default" className="bg-blue-100 text-blue-800">
              {stats.updated}
            </Badge>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Fjernet:</span>
            <Badge variant="default" className="bg-red-100 text-red-800">
              {stats.removed}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">I alt:</span>
            <Badge variant="outline">
              {stats.total_processed}
            </Badge>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload VW Prisliste
          </DialogTitle>
          <DialogDescription>
            {sellerName} - Batch import af Volkswagen modeller
          </DialogDescription>
        </DialogHeader>

        {/* AI Spending Display */}
        <div className="bg-muted/50 rounded-lg p-3 border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Dette måned AI forbrug:</span>
            <div className="flex items-center gap-1">
              <span className="font-medium">${state.aiSpending.toFixed(4)}</span>
              <span className="text-muted-foreground">/ $50.00</span>
            </div>
          </div>
          <div className="mt-2">
            <Progress value={(state.aiSpending / 50) * 100} className="h-1" />
          </div>
        </div>

        <div className="space-y-4">
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
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="rounded-full bg-muted p-3">
                  <FileText className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Træk PDF her eller klik for at vælge</p>
                  <p className="text-sm text-muted-foreground">
                    Kun Volkswagen PDF prislister (maks. 10MB)
                  </p>
                </div>
              </div>
              
              <input
                id="file-upload"
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
                  <p className="text-xs text-muted-foreground">
                    {state.progressMessage}
                  </p>
                  <p className="text-xs text-muted-foreground/70">
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

          {state.result && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium">PDF behandlet succesfuldt!</div>
                  <p className="text-sm mt-1">
                    Batch ID: <code className="text-xs bg-muted px-1 rounded">{state.result.batchId}</code>
                  </p>
                </AlertDescription>
              </Alert>

              {formatStats(state.result.stats)}

              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    if (state.result?.batchId) {
                      navigate(`/admin/batch/${state.result.batchId}/review`)
                    }
                  }}
                  className="flex-1"
                >
                  Gennemse ændringer
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleClose}
                  className="flex-1"
                >
                  Luk
                </Button>
              </div>
            </div>
          )}

          {!state.result && !state.isProcessing && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Annuller
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}