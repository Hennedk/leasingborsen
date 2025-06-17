import { useState, useCallback } from 'react'

// For development/demo - converts images to base64
export const useLocalImageUpload = () => {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const uploadImage = useCallback(async (file: File): Promise<{ publicUrl: string }> => {
    try {
      setUploading(true)
      setError(null)
      setUploadProgress(0)

      // Validate file
      if (!file.type.startsWith('image/')) {
        throw new Error('Kun billedfiler er tilladt')
      }
      
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Billedet må ikke være større end 5MB')
      }

      // Convert to base64
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        
        reader.onload = () => {
          setUploadProgress(100)
          resolve({
            publicUrl: reader.result as string
          })
        }
        
        reader.onerror = () => {
          reject(new Error('Failed to read file'))
        }
        
        reader.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress((e.loaded / e.total) * 100)
          }
        }
        
        reader.readAsDataURL(file)
      })

    } catch (error: any) {
      setError(error.message || 'Upload failed')
      throw error
    } finally {
      setUploading(false)
      setTimeout(() => setUploadProgress(0), 1000)
    }
  }, [])

  return {
    uploading,
    uploadProgress,
    error,
    uploadImage,
    reset: () => {
      setError(null)
      setUploadProgress(0)
    }
  }
}