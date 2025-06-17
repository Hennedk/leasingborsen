import { useState, useCallback } from 'react'

// Alternative image upload using Cloudinary
export const useCloudinaryUpload = () => {
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

      // Create form data for Cloudinary
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', 'your_upload_preset') // Set this in Cloudinary
      formData.append('cloud_name', 'your_cloud_name') // Set this in Cloudinary

      // Upload to Cloudinary
      const response = await fetch(`https://api.cloudinary.com/v1_1/your_cloud_name/image/upload`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const data = await response.json()
      setUploadProgress(100)

      return {
        publicUrl: data.secure_url
      }

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