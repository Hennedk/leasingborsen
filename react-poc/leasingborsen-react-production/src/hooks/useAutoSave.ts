import { useState, useEffect, useCallback, useRef } from 'react'
import { useDebounce } from './useDebounce'

interface UseAutoSaveOptions {
  delay?: number
  onSave: (data: any) => Promise<void>
  onSuccess?: () => void
  onError?: (error: string) => void
  enabled?: boolean
}

interface AutoSaveState {
  isAutoSaving: boolean
  lastSaved: Date | null
  error: string | null
}

/**
 * Custom hook for auto-saving form data with debouncing
 * @param data - The data to auto-save
 * @param options - Configuration options
 * @returns Auto-save state and control functions
 */
export const useAutoSave = <T>(data: T, options: UseAutoSaveOptions) => {
  const {
    delay = 2000, // 2 seconds default
    onSave,
    onSuccess,
    onError,
    enabled = true
  } = options

  const [state, setState] = useState<AutoSaveState>({
    isAutoSaving: false,
    lastSaved: null,
    error: null
  })

  const debouncedData = useDebounce(data, delay)
  const isFirstRender = useRef(true)
  const lastSavedData = useRef<T>(data)

  // Auto-save function
  const performAutoSave = useCallback(async (dataToSave: T) => {
    if (!enabled) return

    setState(prev => ({
      ...prev,
      isAutoSaving: true,
      error: null
    }))

    try {
      await onSave(dataToSave)
      
      setState(prev => ({
        ...prev,
        isAutoSaving: false,
        lastSaved: new Date(),
        error: null
      }))

      lastSavedData.current = dataToSave
      onSuccess?.()
    } catch (error: any) {
      const errorMessage = error.message || 'Der opstod en fejl ved auto-gemning'
      
      setState(prev => ({
        ...prev,
        isAutoSaving: false,
        error: errorMessage
      }))

      onError?.(errorMessage)
    }
  }, [enabled, onSave, onSuccess, onError])

  // Manual save function
  const saveNow = useCallback(async () => {
    if (!enabled) return
    await performAutoSave(data)
  }, [data, performAutoSave, enabled])

  // Reset error state
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  // Effect to trigger auto-save when debounced data changes
  useEffect(() => {
    // Skip auto-save on first render
    if (isFirstRender.current) {
      isFirstRender.current = false
      lastSavedData.current = debouncedData
      return
    }

    // Skip if currently auto-saving
    if (state.isAutoSaving) {
      return
    }

    // Only auto-save if data has actually changed and enabled
    const dataChanged = JSON.stringify(debouncedData) !== JSON.stringify(lastSavedData.current)
    
    if (enabled && dataChanged) {
      performAutoSave(debouncedData)
    }
  }, [debouncedData, enabled, performAutoSave, state.isAutoSaving])

  return {
    ...state,
    saveNow,
    clearError
  }
}

/**
 * Hook specifically for auto-saving images in admin forms
 * @param images - Array of image URLs
 * @param onSave - Function to save the form with updated images
 * @param enabled - Whether auto-save is enabled
 */
export const useImageAutoSave = (
  images: string[],
  onSave: (images: string[]) => Promise<void>,
  enabled: boolean = true
) => {
  return useAutoSave(images, {
    delay: 1500, // Faster for images
    onSave,
    enabled,
    onError: (error) => {
      console.error('Image auto-save failed:', error)
    }
  })
}