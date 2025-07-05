import React, { useCallback, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Checkbox } from '@/components/ui/checkbox'
import { useImageUpload } from '@/hooks/useImageUpload'
import { useBackgroundRemoval } from '@/hooks/useBackgroundRemoval'
import { 
  Upload, 
  X, 
  Link, 
  Loader2, 
  Wand2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ImageUploadProps {
  images: string[]
  onImagesChange: (images: string[]) => void
  maxImages?: number
  className?: string
  enableBackgroundRemoval?: boolean
  onBackgroundRemovalComplete?: (processed: string, original: string, gridUrl?: string, detailUrl?: string) => void
}

interface ProcessingPreview {
  file: File
  originalUrl: string
  processedUrl?: string
  gridUrl?: string
  detailUrl?: string
  error?: string
}

export const ImageUploadWithBackgroundRemoval = React.memo<ImageUploadProps>(({
  images,
  onImagesChange,
  maxImages = 5,
  className,
  enableBackgroundRemoval = true,
  onBackgroundRemovalComplete
}) => {
  const [urlInput, setUrlInput] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [removeBackground, setRemoveBackground] = useState(true)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  const [processingPreview, setProcessingPreview] = useState<ProcessingPreview | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const { 
    uploading, 
    uploadProgress, 
    error: uploadError, 
    uploadImage, 
    validateImageUrl, 
    reset: resetUpload 
  } = useImageUpload()

  const {
    processImage,
    processing,
    progress: processingProgress,
    reset: resetProcessing
  } = useBackgroundRemoval({
    onSuccess: (result) => {
      // Store both grid and detail URLs
      setProcessingPreview(prev => prev ? {
        ...prev,
        processedUrl: result.standardizedImages?.detail?.url || result.standardizedImages?.grid?.url,
        gridUrl: result.standardizedImages?.grid?.url,
        detailUrl: result.standardizedImages?.detail?.url
      } : null)
    },
    onError: (error) => {
      setProcessingPreview(prev => prev ? {
        ...prev,
        error
      } : null)
    }
  })

  const handleFiles = useCallback(async (files: File[]) => {
    console.log('handleFiles called with:', { 
      filesCount: files.length, 
      enableBackgroundRemoval, 
      removeBackground,
      imagesLength: images.length,
      maxImages 
    })
    
    if (images.length >= maxImages) {
      toast.error(`Maksimalt ${maxImages} billeder tilladt`)
      return
    }

    const filesToUpload = files.slice(0, maxImages - images.length)
    
    // If background removal is enabled and checked, process first file
    if (enableBackgroundRemoval && removeBackground && filesToUpload.length > 0) {
      console.log('Starting background removal process...')
      const file = filesToUpload[0] // Process one at a time for now
      const originalUrl = URL.createObjectURL(file)
      
      setProcessingPreview({
        file,
        originalUrl
      })
      setShowPreviewDialog(true)
      
      // Start processing
      try {
        await processImage(file)
      } catch (error) {
        console.error('Error processing image:', error)
      }
    } else {
      console.log('Normal upload without background removal')
      // Normal upload without background removal
      try {
        resetUpload()
        
        for (const file of filesToUpload) {
          const uploadedImage = await uploadImage(file)
          onImagesChange([...images, uploadedImage.publicUrl])
        }
        toast.success(`${filesToUpload.length} billede(r) uploadet succesfuldt`)
      } catch (error) {
        console.error('Error uploading files:', error)
        toast.error('Fejl ved upload af billeder')
      }
    }
  }, [images, maxImages, uploadImage, onImagesChange, resetUpload, enableBackgroundRemoval, removeBackground, processImage])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files))
    }
  }, [handleFiles])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files))
      // Reset the input value to allow selecting the same file again
      e.target.value = ''
    }
  }, [handleFiles])

  const handleConfirmProcessed = useCallback(async () => {
    if (!processingPreview?.processedUrl || !processingPreview.file) return

    try {
      // Use the detail URL as the main image (it's higher quality)
      const mainImageUrl = processingPreview.detailUrl || processingPreview.processedUrl
      
      onImagesChange([...images, mainImageUrl])
      
      if (onBackgroundRemovalComplete) {
        onBackgroundRemovalComplete(
          mainImageUrl, 
          processingPreview.originalUrl,
          processingPreview.gridUrl,
          processingPreview.detailUrl
        )
      }
      
      toast.success('Billede med fjernet baggrund uploadet')
      setShowPreviewDialog(false)
      setProcessingPreview(null)
      resetProcessing()
    } catch (error) {
      console.error('Error uploading processed image:', error)
      toast.error('Fejl ved upload af behandlet billede')
    }
  }, [processingPreview, images, onImagesChange, onBackgroundRemovalComplete, resetProcessing])

  const handleUseOriginal = useCallback(async () => {
    if (!processingPreview?.file) return

    try {
      const uploadedImage = await uploadImage(processingPreview.file)
      onImagesChange([...images, uploadedImage.publicUrl])
      toast.success('Originalt billede uploadet')
      setShowPreviewDialog(false)
      setProcessingPreview(null)
      resetProcessing()
    } catch (error) {
      console.error('Error uploading original:', error)
      toast.error('Fejl ved upload af billede')
    }
  }, [processingPreview, uploadImage, images, onImagesChange, resetProcessing])

  const handleAddUrl = useCallback(() => {
    if (!urlInput.trim()) return

    if (!validateImageUrl(urlInput)) {
      toast.error('Ugyldig billede URL')
      return
    }

    if (images.length >= maxImages) {
      toast.error(`Maksimalt ${maxImages} billeder tilladt`)
      return
    }

    onImagesChange([...images, urlInput.trim()])
    setUrlInput('')
    toast.success('Billede URL tilføjet')
  }, [urlInput, images, maxImages, validateImageUrl, onImagesChange])

  const handleRemoveImage = useCallback((index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    onImagesChange(newImages)
    // Reset file input to allow re-uploading the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [images, onImagesChange])

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddUrl()
    }
  }, [handleAddUrl])

  return (
    <>
      <FormItem className={className}>
        <FormLabel>Billeder ({images.length}/{maxImages})</FormLabel>
        
        {/* Background Removal Toggle */}
        {enableBackgroundRemoval && images.length < maxImages && (
          <div className="flex items-center space-x-2 mb-4">
            <Checkbox
              id="remove-background"
              checked={removeBackground}
              onCheckedChange={(checked) => setRemoveBackground(checked as boolean)}
            />
            <label
              htmlFor="remove-background"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
            >
              <Wand2 className="h-4 w-4" />
              Fjern baggrund automatisk
            </label>
          </div>
        )}
        
        {/* Current Images */}
        {images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            {images.map((image, index) => (
              <div key={`image-${index}-${image.slice(-10)}`} className="relative group">
                <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                  <img
                    src={image}
                    alt={`Billede ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0xMiAxNkM5Ljc5IDEyIDkuNzkgMTIgMTIgMTZaIiBmaWxsPSIjQTFBMUExIi8+CjwvZz4+"'
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemoveImage(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Upload Area */}
        {images.length < maxImages && (
          <div className="space-y-4">
            {/* Drag & Drop Area */}
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                uploading && "opacity-50 pointer-events-none"
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
              />
              
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Uploader... {uploadProgress}%
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      Træk billeder hertil eller{' '}
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0 text-primary"
                        onClick={() => {
                          console.log('File input button clicked')
                          fileInputRef.current?.click()
                        }}
                      >
                        vælg filer
                      </Button>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG, GIF op til 5MB
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* URL Input */}
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="Eller indtast billede URL..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={uploading}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddUrl}
                disabled={uploading || !urlInput.trim()}
              >
                <Link className="h-4 w-4 mr-2" />
                Tilføj URL
              </Button>
            </div>
          </div>
        )}

        {uploadError && <FormMessage>{uploadError}</FormMessage>}
      </FormItem>

      {/* Background Removal Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={(open) => {
        console.log('Dialog onOpenChange:', open)
        setShowPreviewDialog(open)
      }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Baggrundsfjernelse</DialogTitle>
            <DialogDescription>
              Vi behandler dit billede for at fjerne baggrunden og standardisere størrelsen.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Progress indicator */}
            {processing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Behandler billede...</span>
                  <span>{processingProgress}%</span>
                </div>
                <Progress value={processingProgress} />
              </div>
            )}

            {/* Error alert */}
            {processingPreview?.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{processingPreview.error}</AlertDescription>
              </Alert>
            )}

            {/* Image comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Original</h4>
                <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                  {processingPreview?.originalUrl && (
                    <img
                      src={processingPreview.originalUrl}
                      alt="Original"
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  Behandlet
                  {processingPreview?.processedUrl && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                </h4>
                <div 
                  className="aspect-video rounded-lg overflow-hidden"
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
                  {processingPreview?.processedUrl ? (
                    <img
                      src={processingPreview.processedUrl}
                      alt="Behandlet"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {processing ? (
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      ) : (
                        <p className="text-muted-foreground">Afventer behandling...</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleUseOriginal}
              disabled={processing}
            >
              Brug original
            </Button>
            <Button
              onClick={handleConfirmProcessed}
              disabled={processing || !processingPreview?.processedUrl}
            >
              Brug behandlet billede
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
})

ImageUploadWithBackgroundRemoval.displayName = 'ImageUploadWithBackgroundRemoval'