import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { errorMessages } from '@/lib/utils'

/**
 * useAdminImageUpload - Secure image upload using Edge Functions
 * 
 * Replaces direct storage access with Edge Function calls for admin operations
 * Maintains compatibility with existing useImageUpload interface
 * Includes auto-save functionality for admin forms
 */

export interface UploadedImage {
  id: string
  url: string
  publicUrl: string
  name: string
  size: number
  processedUrl?: string // For background-removed images
}

interface ImageUploadOptions {
  processBackground?: boolean
  listingId?: string
}

export const useAdminImageUpload = () => {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Convert File to base64 for Edge Function
  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
    })
  }, [])

  const uploadImage = useCallback(async (
    file: File, 
    options: ImageUploadOptions = {}
  ): Promise<UploadedImage> => {
    try {
      setUploading(true)
      setError(null)
      setUploadProgress(0)

      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Kun billedfiler er tilladt')
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Billedet må ikke være større end 5MB')
      }

      // Convert file to base64
      const base64Data = await fileToBase64(file)
      setUploadProgress(25)

      // Call Edge Function for upload with detailed logging
      console.log('🔄 Calling admin-image-operations with:', {
        operation: 'upload',
        fileName: file.name,
        contentType: file.type,
        processBackground: options.processBackground,
        fileSize: file.size
      })

      const { data, error: uploadError } = await supabase.functions.invoke('admin-image-operations', {
        body: {
          operation: 'upload',
          imageData: {
            file: base64Data,
            fileName: file.name,
            contentType: file.type
          },
          processBackground: options.processBackground === true
        }
      })

      console.log('📥 Edge Function response:', { data, uploadError })

      if (uploadError) {
        console.error('Edge Function error details:', {
          message: uploadError.message,
          details: uploadError.details,
          hint: uploadError.hint,
          code: uploadError.code
        })
        throw new Error(uploadError.message || errorMessages.uploadError)
      }

      if (!data?.success) {
        console.error('Edge Function returned unsuccessful result:', data)
        throw new Error(data?.error || errorMessages.uploadError)
      }

      setUploadProgress(100)

      const result: UploadedImage = {
        id: data.imageUrl, // Use URL as ID for consistency
        url: data.imageUrl,
        publicUrl: data.imageUrl,
        name: file.name,
        size: file.size
      }

      // Add processed URL if background removal was successful
      if (data.processedImageUrl) {
        result.processedUrl = data.processedImageUrl
      }

      console.log('✅ Image uploaded successfully via Edge Function')
      return result

    } catch (error: any) {
      console.error('Error in uploadImage:', error)
      const errorMessage = error.message || errorMessages.uploadError
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setUploading(false)
      setTimeout(() => setUploadProgress(0), 1000)
    }
  }, [fileToBase64])

  const uploadMultipleImages = useCallback(async (
    files: File[], 
    options: ImageUploadOptions = {}
  ): Promise<UploadedImage[]> => {
    try {
      setUploading(true)
      setError(null)
      setUploadProgress(0)

      const uploadPromises = files.map(async (file, index) => {
        const result = await uploadImage(file, options)
        setUploadProgress(((index + 1) / files.length) * 100)
        return result
      })

      const results = await Promise.all(uploadPromises)
      
      console.log(`✅ ${results.length} images uploaded successfully`)
      return results

    } catch (error: any) {
      console.error('Error in uploadMultipleImages:', error)
      const errorMessage = error.message || errorMessages.uploadError
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setUploading(false)
    }
  }, [uploadImage])

  const deleteImage = useCallback(async (imageUrl: string): Promise<void> => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-image-operations', {
        body: {
          operation: 'delete',
          imageUrl
        }
      })

      if (error) {
        console.error('Edge Function error:', error)
        throw new Error(error.message || errorMessages.deleteError)
      }

      if (!data?.success) {
        throw new Error(data?.error || errorMessages.deleteError)
      }

      console.log('✅ Image deleted successfully via Edge Function')

    } catch (error: any) {
      console.error('Error in deleteImage:', error)
      throw new Error(error.message || errorMessages.deleteError)
    }
  }, [])

  const updateListingImages = useCallback(async (
    listingId: string, 
    imageUrls: string[]
  ): Promise<void> => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-image-operations', {
        body: {
          operation: 'updateListingImages',
          listingId,
          imageUrls
        }
      })

      if (error) {
        console.error('Edge Function error:', error)
        throw new Error(error.message || errorMessages.updateError)
      }

      if (!data?.success) {
        throw new Error(data?.error || errorMessages.updateError)
      }

      console.log('✅ Listing images updated successfully via Edge Function')

    } catch (error: any) {
      console.error('Error in updateListingImages:', error)
      throw new Error(error.message || errorMessages.updateError)
    }
  }, [])

  const processBackground = useCallback(async (imageUrl: string): Promise<string> => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-image-operations', {
        body: {
          operation: 'processBackground',
          imageUrl
        }
      })

      if (error) {
        console.error('Edge Function error:', error)
        throw new Error(error.message || 'Der opstod en fejl ved baggrunds behandling')
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Baggrunds behandling fejlede')
      }

      console.log('✅ Background processing completed via Edge Function')
      return data.processedImageUrl

    } catch (error: any) {
      console.error('Error in processBackground:', error)
      throw new Error(error.message || 'Der opstod en fejl ved baggrunds behandling')
    }
  }, [])

  const validateImageUrl = useCallback((url: string): boolean => {
    try {
      const urlObj = new URL(url)
      // Check if it's a valid URL and has an image extension
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
      const hasImageExtension = imageExtensions.some(ext => 
        urlObj.pathname.toLowerCase().endsWith(ext)
      )
      
      return hasImageExtension || urlObj.hostname.includes('supabase') // Allow Supabase URLs
    } catch {
      return false
    }
  }, [])

  const reset = useCallback(() => {
    setError(null)
    setUploadProgress(0)
  }, [])

  // Auto-save functionality for admin forms
  const createAutoSave = useCallback((
    listingId: string,
    images: string[],
    interval: number = 1500 // 1.5 seconds as per existing behavior
  ) => {
    let timeoutId: NodeJS.Timeout

    const performAutoSave = async () => {
      try {
        if (images.length > 0) {
          console.log('🔄 Auto-saving images for listing:', listingId)
          await updateListingImages(listingId, images)
          console.log('✅ Auto-save completed')
        }
      } catch (error) {
        console.error('Auto-save failed:', error)
        // Don't throw - auto-save failures should be silent
      }
    }

    const scheduleAutoSave = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(performAutoSave, interval)
    }

    const cleanup = () => {
      clearTimeout(timeoutId)
    }

    // Initial schedule
    scheduleAutoSave()

    return {
      scheduleAutoSave,
      cleanup,
      performAutoSave
    }
  }, [updateListingImages])

  return {
    // Core functionality
    uploading,
    uploadProgress,
    error,
    uploadImage,
    uploadMultipleImages,
    deleteImage,
    validateImageUrl,
    reset,

    // Admin-specific functionality
    updateListingImages,
    processBackground,
    createAutoSave,

    // Convenience getters
    isUploading: uploading,
    hasError: !!error
  }
}

// Hook specifically for auto-save functionality
export const useImageAutoSave = (listingId?: string) => {
  const { createAutoSave } = useAdminImageUpload()
  
  return useCallback((images: string[]) => {
    if (!listingId || images.length === 0) {
      return { cleanup: () => {} }
    }
    
    return createAutoSave(listingId, images)
  }, [listingId, createAutoSave])
}