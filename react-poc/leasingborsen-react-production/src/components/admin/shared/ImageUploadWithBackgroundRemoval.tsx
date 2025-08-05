import React, { useCallback, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Checkbox } from '@/components/ui/checkbox'
import { useAdminImageUpload } from '@/hooks/useAdminImageUpload'
import { 
  Upload, 
  X, 
  Link, 
  Loader2, 
  Wand2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ImageUploadProps {
  images: string[]
  onImagesChange: (images: string[]) => void
  maxImages?: number
  className?: string
  enableBackgroundRemoval?: boolean
  onBackgroundRemovalComplete?: (processed: string, original: string, gridUrl?: string, detailUrl?: string) => void
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const { 
    uploading, 
    uploadProgress, 
    error: uploadError, 
    uploadImage, 
    processBackground,
    validateImageUrl, 
    reset: resetUpload
  } = useAdminImageUpload()

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
    
    try {
      resetUpload()
      
      // Collect all new image URLs to add at once
      const newImageUrls: string[] = []
      
      for (const file of filesToUpload) {
        if (enableBackgroundRemoval && removeBackground) {
          // Process with background removal
          console.log('Processing image with background removal...')
          const result = await uploadImage(file, { processBackground: true })
          const processedUrl = result.processedUrl || result.url
          
          newImageUrls.push(processedUrl)
          
          if (onBackgroundRemovalComplete) {
            onBackgroundRemovalComplete(
              processedUrl, 
              URL.createObjectURL(file),
              result.processedUrl,
              result.processedUrl
            )
          }
        } else {
          // Normal upload without background removal
          const uploadedImage = await uploadImage(file)
          newImageUrls.push(uploadedImage.publicUrl)
        }
      }
      
      // Update images array once with all new URLs
      onImagesChange([...images, ...newImageUrls])
      
      const message = enableBackgroundRemoval && removeBackground 
        ? `${newImageUrls.length} billede(r) uploadet med fjernet baggrund`
        : `${newImageUrls.length} billede(r) uploadet`
      toast.success(message)
      
    } catch (error) {
      console.error('Error uploading files:', error)
      toast.error('Fejl ved upload af billeder')
    }
  }, [images, maxImages, uploadImage, onImagesChange, resetUpload, enableBackgroundRemoval, removeBackground, onBackgroundRemovalComplete])

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


  const handleAddUrl = useCallback(async () => {
    if (!urlInput.trim()) return

    console.log('🔗 handleAddUrl called with URL:', urlInput.trim())
    console.log('🔗 Remove background enabled:', enableBackgroundRemoval, removeBackground)

    if (!validateImageUrl(urlInput)) {
      toast.error('Ugyldig billede URL')
      return
    }

    if (images.length >= maxImages) {
      toast.error(`Maksimalt ${maxImages} billeder tilladt`)
      return
    }

    const imageUrl = urlInput.trim()
    setUrlInput('')
    
    try {
      if (enableBackgroundRemoval && removeBackground) {
        // Process URL with background removal
        console.log('🔗 Processing URL with background removal...')
        const processedUrl = await processBackground(imageUrl)
        
        onImagesChange([...images, processedUrl])
        
        if (onBackgroundRemovalComplete) {
          onBackgroundRemovalComplete(
            processedUrl, 
            imageUrl,
            processedUrl,
            processedUrl
          )
        }
        
        toast.success('Billede tilføjet med fjernet baggrund')
      } else {
        // Normal URL add without background removal
        onImagesChange([...images, imageUrl])
        toast.success('Billede URL tilføjet')
      }
    } catch (error) {
      console.error('Error processing URL:', error)
      toast.error('Fejl ved behandling af billede URL')
    }
  }, [urlInput, images, maxImages, validateImageUrl, onImagesChange, enableBackgroundRemoval, removeBackground, processBackground, onBackgroundRemovalComplete])

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
    </>
  )
})

ImageUploadWithBackgroundRemoval.displayName = 'ImageUploadWithBackgroundRemoval'