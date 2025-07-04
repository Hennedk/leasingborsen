import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface StandardizedImage {
  url: string
  variant: string
  dimensions: string
}

interface ProcessingResult {
  success: boolean
  original?: string
  processed?: string
  standardizedImages?: {
    grid?: StandardizedImage
    detail?: StandardizedImage
  }
  error?: string
}

interface UseBackgroundRemovalOptions {
  onSuccess?: (result: ProcessingResult) => void
  onError?: (error: string) => void
}

interface UseBackgroundRemovalReturn {
  processImage: (file: File) => Promise<ProcessingResult>
  processing: boolean
  progress: number
  error: string | null
  reset: () => void
}

export function useBackgroundRemoval(options?: UseBackgroundRemovalOptions): UseBackgroundRemovalReturn {
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const processImage = useCallback(async (file: File): Promise<ProcessingResult> => {
    // Reset state
    setProcessing(true)
    setProgress(0)
    setError(null)

    try {
      // Validate file
      if (!file.type.startsWith('image/')) {
        throw new Error('Vælg venligst en gyldig billedfil')
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Filstørrelsen må ikke overstige 10MB')
      }

      setProgress(20)

      // Convert to base64
      const base64 = await fileToBase64(file)
      setProgress(40)

      // Call Edge Function
      const { data, error: functionError } = await supabase.functions.invoke('remove-bg', {
        body: {
          imageData: base64,
          fileName: file.name,
        },
      })

      setProgress(80)

      if (functionError) {
        throw new Error(`Behandlingsfejl: ${functionError.message || 'Ukendt fejl'}`)
      }

      if (!data) {
        throw new Error('Ingen data returneret fra behandlingen')
      }

      if (!data.success) {
        throw new Error(data.error || 'Behandlingen mislykkedes')
      }

      setProgress(100)
      
      // Call success callback if provided
      if (options?.onSuccess) {
        options.onSuccess(data)
      }

      return data

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Der opstod en ukendt fejl'
      setError(errorMessage)
      
      // Call error callback if provided
      if (options?.onError) {
        options.onError(errorMessage)
      }
      
      throw err
    } finally {
      setProcessing(false)
    }
  }, [options])

  const reset = useCallback(() => {
    setProcessing(false)
    setProgress(0)
    setError(null)
  }, [])

  return {
    processImage,
    processing,
    progress,
    error,
    reset
  }
}