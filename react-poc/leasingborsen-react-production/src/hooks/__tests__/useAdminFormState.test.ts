import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAdminFormState } from '../useAdminFormState'
import { useReferenceData } from '../useReferenceData'
import { useCreateListingWithOffers, useUpdateListingWithOffers } from '../useAdminOperations'
import { toast } from 'sonner'

// Mock dependencies
vi.mock('../useReferenceData')
vi.mock('../useAdminOperations')
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn()
}))

// Test data
const mockReferenceData = {
  makes: [{ id: 'make-1', name: 'Toyota' }],
  models: [{ id: 'model-1', name: 'Corolla', make_id: 'make-1' }],
  bodyTypes: [{ id: 'body-1', name: 'Sedan' }],
  fuelTypes: [{ id: 'fuel-1', name: 'Benzin' }],
  transmissions: [{ id: 'trans-1', name: 'Automatisk' }],
  sellers: [{ id: 'seller-1', name: 'Test Dealer' }]
}

const mockListing = {
  listing_id: 'test-id',
  id: 'test-id',
  make_id: 'make-1',
  model_id: 'model-1',
  body_type_id: 'body-1',
  fuel_type_id: 'fuel-1',
  transmission_id: 'trans-1',
  seller_id: 'seller-1',
  images: ['https://example.com/1.jpg', 'https://example.com/2.jpg'],
  image: 'https://example.com/1.jpg',
  processed_image_grid: 'https://example.com/grid.jpg',
  processed_image_detail: 'https://example.com/detail.jpg',
  year: 2023,
  retail_price: 250000
}

// Helper to render hook with providers
const renderHookWithProviders = (props = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )

  return renderHook(() => useAdminFormState(props), { wrapper })
}

describe('useAdminFormState', () => {
  const mockCreateMutation = {
    mutateAsync: vi.fn(),
    isPending: false,
    error: null
  }

  const mockUpdateMutation = {
    mutateAsync: vi.fn(),
    isPending: false,
    error: null
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    vi.mocked(useReferenceData).mockReturnValue({
      data: mockReferenceData,
      isLoading: false,
      error: null,
      refetch: vi.fn()
    } as any)

    vi.mocked(useCreateListingWithOffers).mockReturnValue(mockCreateMutation as any)
    vi.mocked(useUpdateListingWithOffers).mockReturnValue(mockUpdateMutation as any)
  })

  describe('Image Loading from Database', () => {
    it('should load images from array field when available', () => {
      const { result } = renderHookWithProviders({
        listing: mockListing,
        isEditing: true
      })

      // Check that form was initialized with images from array
      const formValues = result.current.form.getValues()
      expect(formValues.images).toEqual(mockListing.images)
      expect(formValues.processed_image_grid).toBe(mockListing.processed_image_grid)
      expect(formValues.processed_image_detail).toBe(mockListing.processed_image_detail)
    })

    it('should fallback to single image field when images array is empty', () => {
      const listingWithSingleImage = {
        ...mockListing,
        images: null,
        image: 'https://example.com/single.jpg'
      }

      const { result } = renderHookWithProviders({
        listing: listingWithSingleImage,
        isEditing: true
      })

      const formValues = result.current.form.getValues()
      expect(formValues.images).toEqual(['https://example.com/single.jpg'])
    })

    it('should handle missing images gracefully', () => {
      const listingWithoutImages = {
        ...mockListing,
        images: null,
        image: null
      }

      const { result } = renderHookWithProviders({
        listing: listingWithoutImages,
        isEditing: true
      })

      const formValues = result.current.form.getValues()
      expect(formValues.images).toEqual([])
    })
  })

  describe('Auto-Save Behavior', () => {
    it('should trigger auto-save when images change', async () => {
      vi.useFakeTimers()

      const { result } = renderHookWithProviders({
        listing: mockListing,
        isEditing: true
      })

      // Change images
      act(() => {
        result.current.handleImagesChange([
          'https://example.com/new1.jpg',
          'https://example.com/new2.jpg'
        ])
      })

      // Fast-forward past auto-save delay (1500ms)
      act(() => {
        vi.advanceTimersByTime(1600)
      })

      await waitFor(() => {
        expect(mockUpdateMutation.mutateAsync).toHaveBeenCalledWith({
          listingId: mockListing.listing_id,
          listingData: expect.objectContaining({
            images: ['https://example.com/new1.jpg', 'https://example.com/new2.jpg']
          }),
          offers: undefined
        })
      })

      vi.useRealTimers()
    })

    it('should trigger auto-save when processed images change', async () => {
      vi.useFakeTimers()

      const { result } = renderHookWithProviders({
        listing: mockListing,
        isEditing: true
      })

      // Change processed images
      act(() => {
        result.current.handleProcessedImagesChange(
          'https://example.com/new-grid.jpg',
          'https://example.com/new-detail.jpg'
        )
      })

      // Fast-forward past auto-save delay
      act(() => {
        vi.advanceTimersByTime(1600)
      })

      await waitFor(() => {
        expect(mockUpdateMutation.mutateAsync).toHaveBeenCalledWith({
          listingId: mockListing.listing_id,
          listingData: expect.objectContaining({
            processed_image_grid: 'https://example.com/new-grid.jpg',
            processed_image_detail: 'https://example.com/new-detail.jpg'
          }),
          offers: undefined
        })
      })

      vi.useRealTimers()
    })

    it('should prevent concurrent auto-saves', async () => {
      vi.useFakeTimers()

      const { result } = renderHookWithProviders({
        listing: mockListing,
        isEditing: true
      })

      // Trigger multiple changes rapidly
      act(() => {
        result.current.handleImagesChange(['https://example.com/1.jpg'])
      })

      act(() => {
        vi.advanceTimersByTime(500)
      })

      act(() => {
        result.current.handleImagesChange(['https://example.com/1.jpg', 'https://example.com/2.jpg'])
      })

      // Fast-forward to trigger auto-save
      act(() => {
        vi.advanceTimersByTime(1600)
      })

      await waitFor(() => {
        // Should only save once with the latest data
        expect(mockUpdateMutation.mutateAsync).toHaveBeenCalledTimes(1)
        expect(mockUpdateMutation.mutateAsync).toHaveBeenCalledWith({
          listingId: mockListing.listing_id,
          listingData: expect.objectContaining({
            images: ['https://example.com/1.jpg', 'https://example.com/2.jpg']
          }),
          offers: undefined
        })
      })

      vi.useRealTimers()
    })

    it('should not auto-save when creating new listing', async () => {
      vi.useFakeTimers()

      const { result } = renderHookWithProviders({
        listing: undefined,
        isEditing: false
      })

      // Change images
      act(() => {
        result.current.handleImagesChange(['https://example.com/new.jpg'])
      })

      // Fast-forward past auto-save delay
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      // Should not have called update mutation
      expect(mockUpdateMutation.mutateAsync).not.toHaveBeenCalled()

      vi.useRealTimers()
    })
  })

  describe('Form Submission', () => {
    it('should save all image fields on manual save', async () => {
      const { result } = renderHookWithProviders({
        listing: mockListing,
        isEditing: true
      })

      // Set form values
      act(() => {
        result.current.form.setValue('images', ['https://example.com/updated.jpg'])
        result.current.handleProcessedImagesChange(
          'https://example.com/grid-updated.jpg',
          'https://example.com/detail-updated.jpg'
        )
      })

      // Submit form
      await act(async () => {
        await result.current.handleSubmit(result.current.form.getValues())
      })

      expect(mockUpdateMutation.mutateAsync).toHaveBeenCalledWith({
        listingId: mockListing.listing_id,
        listingData: expect.objectContaining({
          images: ['https://example.com/updated.jpg'],
          image: 'https://example.com/updated.jpg', // First image becomes primary
          processed_image_grid: 'https://example.com/grid-updated.jpg',
          processed_image_detail: 'https://example.com/detail-updated.jpg'
        }),
        offers: undefined
      })

      expect(toast.success).toHaveBeenCalledWith('Annoncen blev opdateret succesfuldt')
    })

    it('should handle save errors with Danish messages', async () => {
      mockUpdateMutation.mutateAsync.mockRejectedValueOnce(
        new Error('Network error')
      )

      const { result } = renderHookWithProviders({
        listing: mockListing,
        isEditing: true
      })

      await act(async () => {
        await result.current.handleSubmit(result.current.form.getValues())
      })

      expect(toast.error).toHaveBeenCalledWith('Der opstod en fejl ved gemning')
    })
  })

  describe('State Management', () => {
    it('should track unsaved changes correctly', () => {
      const { result } = renderHookWithProviders({
        listing: mockListing,
        isEditing: true
      })

      expect(result.current.hasUnsavedChanges).toBe(false)

      // Make a change
      act(() => {
        result.current.form.setValue('variant', 'Sport Edition')
      })

      // Should now have unsaved changes
      expect(result.current.hasUnsavedChanges).toBe(true)
    })

    it('should not mark as dirty for image changes (auto-saved)', () => {
      const { result } = renderHookWithProviders({
        listing: mockListing,
        isEditing: true
      })

      // Change images
      act(() => {
        result.current.handleImagesChange(['https://example.com/new.jpg'])
      })

      // Should not be marked as having unsaved changes (auto-saved)
      expect(result.current.hasUnsavedChanges).toBe(false)
    })

    it('should reset form state correctly', () => {
      const { result } = renderHookWithProviders({
        listing: mockListing,
        isEditing: true
      })

      // Make changes
      act(() => {
        result.current.form.setValue('variant', 'Modified')
        result.current.form.setValue('year', '2024')
      })

      // Reset form
      act(() => {
        result.current.handleReset()
      })

      // Should be back to original values
      const formValues = result.current.form.getValues()
      expect(formValues.variant).toBe(mockListing.variant || '')
      expect(formValues.year).toBe(mockListing.year.toString())
    })
  })
})