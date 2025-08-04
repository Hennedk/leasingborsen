import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@/test/test-utils'
import { useAdminFormState } from '../useAdminFormState'
import { mockReferenceData, mockListing, mockCreateMutation, mockUpdateMutation, mockUseReferenceData } from '@/test/test-utils'
import { toast } from 'sonner'

// Mock the dependencies
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

vi.mock('@/hooks/useReferenceData', () => ({
  useReferenceData: () => mockUseReferenceData
}))

vi.mock('@/hooks/useAdminOperations', () => ({
  useCreateListingWithOffers: () => mockCreateMutation,
  useUpdateListingWithOffers: () => mockUpdateMutation
}))

describe('useAdminFormState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('initializes with default values for new listing', () => {
      const { result } = renderHook(() => 
        useAdminFormState({ isEditing: false })
      )

      expect(result.current.isEditing).toBe(false)
      expect(result.current.hasUnsavedChanges).toBe(false)
      expect(result.current.currentListingId).toBeUndefined()
      expect(result.current.selectedMakeId).toBe('')
      expect(result.current.form).toBeDefined()
    })

    it('initializes with listing data when editing', () => {
      const { result } = renderHook(() => 
        useAdminFormState({ listing: mockListing, isEditing: true })
      )

      expect(result.current.isEditing).toBe(true)
      expect(result.current.currentListingId).toBe(mockListing.listing_id)
      
      // Check form values are populated
      const formValues = result.current.form.getValues()
      expect(formValues.make).toBe(mockListing.make)
      expect(formValues.model).toBe(mockListing.model)
      expect(formValues.body_type).toBe(mockListing.body_type)
    })

    it('provides reference data and loading state', () => {
      const { result } = renderHook(() => 
        useAdminFormState({ isEditing: false })
      )

      expect(result.current.referenceData).toEqual(mockReferenceData)
      expect(result.current.referenceLoading).toBe(false)
    })
  })

  describe('Loading States', () => {
    it('calculates loading state correctly', () => {
      const { result } = renderHook(() => 
        useAdminFormState({ isEditing: false })
      )

      expect(result.current.isLoading).toBe(false)
    })

    it('returns true when mutations are pending', () => {
      mockCreateMutation.isPending = true
      
      const { result } = renderHook(() => 
        useAdminFormState({ isEditing: false })
      )

      expect(result.current.isLoading).toBe(true)
      
      // Reset for other tests
      mockCreateMutation.isPending = false
    })
  })

  describe('Form Handlers', () => {
    it('handles make change correctly', () => {
      const { result } = renderHook(() => 
        useAdminFormState({ isEditing: false })
      )

      act(() => {
        result.current.handleMakeChange('1') // Audi ID
      })

      expect(result.current.selectedMakeId).toBe('1')
      expect(result.current.form.getValues('make')).toBe('Audi')
      expect(result.current.form.getValues('model')).toBe('') // Should reset
    })

    it('handles images change correctly', () => {
      const { result } = renderHook(() => 
        useAdminFormState({ isEditing: false })
      )

      const testImages = ['image1.jpg', 'image2.jpg']

      act(() => {
        result.current.handleImagesChange(testImages)
      })

      expect(result.current.form.getValues('images')).toEqual(testImages)
      expect(result.current.form.getValues('image_urls')).toEqual(testImages)
    })

    it('handles cancel with unsaved changes', () => {
      const { result } = renderHook(() => 
        useAdminFormState({ isEditing: false })
      )

      // Simulate unsaved changes
      act(() => {
        result.current.form.setValue('make', 'Changed Value', { shouldDirty: true })
      })

      // Should show confirm dialog and navigate if confirmed
      act(() => {
        result.current.handleCancel()
      })

      expect(global.confirm).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('/admin/listings')
    })
  })

  describe('Form Submission', () => {
    it('handles successful creation', async () => {
      const { result } = renderHook(() => 
        useAdminFormState({ isEditing: false })
      )

      const formData = {
        make: 'Audi',
        model: 'A3',
        body_type: 'Hatchback',
        fuel_type: 'Diesel',
        transmission: 'Automatic',
        seller_id: 'seller-1'
      }

      await act(async () => {
        await result.current.handleSubmit(formData as any)
      })

      expect(mockCreateMutation.mutateAsync).toHaveBeenCalledWith({
        listingData: expect.objectContaining({
          make_id: '1', // Audi ID
          model_id: '1', // A3 ID
          body_type_id: '1',
          fuel_type_id: '2',
          transmission_id: '2'
        }),
        offers: undefined
      })
    })

    it('handles successful update', async () => {
      const { result } = renderHook(() => 
        useAdminFormState({ listing: mockListing, isEditing: true })
      )

      const formData = {
        make: 'BMW',
        model: 'X3',
        body_type: 'SUV',
        fuel_type: 'Benzin',
        transmission: 'Manual',
        seller_id: 'seller-2'
      }

      await act(async () => {
        await result.current.handleSubmit(formData as any)
      })

      expect(mockUpdateMutation.mutateAsync).toHaveBeenCalledWith({
        listingId: mockListing.listing_id,
        listingData: expect.objectContaining({
          make_id: '2', // BMW ID
          model_id: '3', // X3 ID
          body_type_id: '3', // SUV ID
          fuel_type_id: '1', // Benzin ID
          transmission_id: '1' // Manual ID
        }),
        offers: undefined
      })
    })

    it('handles submission errors', async () => {
      const errorMessage = 'Submission failed'
      mockCreateMutation.mutateAsync.mockRejectedValueOnce(new Error(errorMessage))

      const { result } = renderHook(() => 
        useAdminFormState({ isEditing: false })
      )

      const formData = {
        make: 'Audi',
        model: 'A3',
        body_type: 'Hatchback',
        fuel_type: 'Diesel',
        transmission: 'Automatic',
        seller_id: 'seller-1'
      }

      // handleSubmit catches errors internally, so we don't await rejection
      await act(async () => {
        await result.current.handleSubmit(formData as any)
      })

      // Verify the error was handled by showing a toast
      expect(toast.error).toHaveBeenCalledWith(errorMessage)
    })

    it('validates required reference data', async () => {
      // Mock missing reference data
      const incompleteReferenceData = {
        ...mockReferenceData,
        makes: [] // Missing makes
      }
      
      vi.mocked(mockUseReferenceData).data = incompleteReferenceData

      const { result } = renderHook(() => 
        useAdminFormState({ isEditing: false })
      )

      const formData = {
        make: 'NonexistentMake',
        model: 'A3',
        body_type: 'Hatchback',
        fuel_type: 'Diesel',
        transmission: 'Automatic',
        seller_id: 'seller-1'
      }

      await act(async () => {
        await result.current.handleSubmit(formData as any)
      })

      const { toast } = await import('sonner')
      expect(toast.error).toHaveBeenCalledWith('Manglende reference data IDs. Sørg for at alle felter er udfyldt.')
      
      // Reset for other tests
      vi.mocked(mockUseReferenceData).data = mockReferenceData
    })
  })

  describe('Form Reset', () => {
    it('resets form to original values', () => {
      const { result } = renderHook(() => 
        useAdminFormState({ listing: mockListing, isEditing: true })
      )

      // Change form values
      act(() => {
        result.current.form.setValue('make', 'Changed Make')
        result.current.form.setValue('model', 'Changed Model')
      })

      // Reset form
      act(() => {
        result.current.handleReset()
      })

      // Should restore original values
      expect(result.current.form.getValues('make')).toBe(mockListing.make)
      expect(result.current.form.getValues('model')).toBe(mockListing.model)
    })
  })

  describe('Change Detection', () => {
    it('detects unsaved changes on form fields', async () => {
      const { result } = renderHook(() => 
        useAdminFormState({ isEditing: false })
      )

      expect(result.current.hasUnsavedChanges).toBe(false)

      act(() => {
        result.current.form.setValue('make', 'New Make', { shouldDirty: true })
      })

      await waitFor(() => {
        expect(result.current.hasUnsavedChanges).toBe(true)
      })
    })
  })
})