import React, { useCallback, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useImageUpload } from '@/hooks/useImageUpload'
import { Upload, X, Link, Image as ImageIcon, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ImageUploadProps {
  images: string[]
  onImagesChange: (images: string[]) => void
  maxImages?: number
  className?: string
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  images,
  onImagesChange,
  maxImages = 5,
  className
}) => {
  const [urlInput, setUrlInput] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const { 
    uploading, 
    uploadProgress, 
    error, 
    uploadImage, 
    validateImageUrl, 
    reset 
  } = useImageUpload()

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
  }, [])

  const handleFiles = useCallback(async (files: File[]) => {
    if (images.length >= maxImages) {
      return
    }

    const filesToUpload = files.slice(0, maxImages - images.length)
    
    try {
      reset()
      
      for (const file of filesToUpload) {
        const uploadedImage = await uploadImage(file)
        onImagesChange([...images, uploadedImage.publicUrl])
      }
      toast.success(`${filesToUpload.length} billede(r) uploadet succesfuldt`)
    } catch (error) {
      console.error('Error uploading files:', error)
      toast.error('Fejl ved upload af billeder')
    }
  }, [images, maxImages, uploadImage, onImagesChange, reset])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files))
    }
  }, [handleFiles])

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
  }, [images, onImagesChange])

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddUrl()
    }
  }, [handleAddUrl])

  return (
    <FormItem className={className}>
      <FormLabel>Billeder ({images.length}/{maxImages})</FormLabel>
      
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
                      onClick={() => fileInputRef.current?.click()}
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
            <div className="flex-1">
              <div className="relative">
                <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="url"
                  placeholder="Eller indtast billede URL..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-10"
                />
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleAddUrl}
              disabled={!urlInput.trim() || uploading}
            >
              <ImageIcon className="h-4 w-4 mr-2" />
              Tilføj
            </Button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="text-sm text-destructive mt-2">
          {error}
        </div>
      )}
      
      <FormMessage />
    </FormItem>
  )
}