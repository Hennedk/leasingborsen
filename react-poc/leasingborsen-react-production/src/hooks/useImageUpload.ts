import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface UploadedImage {
  id: string
  url: string
  publicUrl: string
  name: string
  size: number
}

export const useImageUpload = () => {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const uploadImage = useCallback(async (file: File, folder: string = 'listings'): Promise<UploadedImage> => {
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

      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${folder}/${fileName}`

      // Upload file to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Error uploading image:', uploadError)
        throw new Error('Der opstod en fejl ved upload af billedet')
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath)

      setUploadProgress(100)

      return {
        id: data.path,
        url: filePath,
        publicUrl,
        name: file.name,
        size: file.size
      }

    } catch (error: any) {
      console.error('Error in uploadImage:', error)
      setError(error.message || 'Der opstod en ukendt fejl ved upload')
      throw error
    } finally {
      setUploading(false)
      setTimeout(() => setUploadProgress(0), 1000)
    }
  }, [])

  const uploadMultipleImages = useCallback(async (files: File[], folder: string = 'listings'): Promise<UploadedImage[]> => {
    try {
      setUploading(true)
      setError(null)
      setUploadProgress(0)

      const uploadPromises = files.map(async (file, index) => {
        const result = await uploadImage(file, folder)
        setUploadProgress(((index + 1) / files.length) * 100)
        return result
      })

      const results = await Promise.all(uploadPromises)
      return results

    } catch (error: any) {
      console.error('Error in uploadMultipleImages:', error)
      setError(error.message || 'Der opstod en fejl ved upload af billeder')
      throw error
    } finally {
      setUploading(false)
    }
  }, [uploadImage])

  const deleteImage = useCallback(async (filePath: string): Promise<void> => {
    try {
      const { error } = await supabase.storage
        .from('images')
        .remove([filePath])

      if (error) {
        console.error('Error deleting image:', error)
        throw new Error('Der opstod en fejl ved sletning af billedet')
      }

    } catch (error: any) {
      console.error('Error in deleteImage:', error)
      throw error
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

  return {
    uploading,
    uploadProgress,
    error,
    uploadImage,
    uploadMultipleImages,
    deleteImage,
    validateImageUrl,
    reset
  }
}