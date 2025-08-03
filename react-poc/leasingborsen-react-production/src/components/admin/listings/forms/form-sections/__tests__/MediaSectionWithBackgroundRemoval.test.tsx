import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { MediaSectionWithBackgroundRemoval } from '../MediaSectionWithBackgroundRemoval'
import type { CarListingFormData } from '@/lib/validations'

// Mock the ImageUploadWithBackgroundRemoval component
vi.mock('@/components/admin/shared/ImageUploadWithBackgroundRemoval', () => ({
  ImageUploadWithBackgroundRemoval: ({ 
    images, 
    onImagesChange, 
    onBackgroundRemovalComplete,
    enableBackgroundRemoval 
  }: any) => (
    <div data-testid="image-upload-component">
      <div>Current images: {images.length}</div>
      <div>Background removal: {enableBackgroundRemoval ? 'enabled' : 'disabled'}</div>
      <button onClick={() => onImagesChange(['new-image.jpg'])}>
        Add Image
      </button>
      <button onClick={() => onBackgroundRemovalComplete?.(
        'processed.jpg',
        'original.jpg', 
        'grid.jpg',
        'detail.jpg'
      )}>
        Complete Background Removal
      </button>
    </div>
  )
}))

// Test wrapper component
const TestWrapper = ({ 
  defaultValues = {},
  onImagesChange = vi.fn(),
  onProcessedImagesChange = vi.fn()
}: any) => {
  const form = useForm<CarListingFormData>({
    defaultValues: {
      images: [],
      processed_image_grid: '',
      processed_image_detail: '',
      ...defaultValues
    }
  })

  return (
    <MediaSectionWithBackgroundRemoval
      control={form.control}
      onImagesChange={onImagesChange}
      onProcessedImagesChange={onProcessedImagesChange}
      enableBackgroundRemoval={true}
    />
  )
}

describe('MediaSectionWithBackgroundRemoval', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Component Integration', () => {
    it('should render with form field integration', () => {
      render(<TestWrapper />)
      
      expect(screen.getByTestId('image-upload-component')).toBeInTheDocument()
      expect(screen.getByText('Current images: 0')).toBeInTheDocument()
      expect(screen.getByText('Background removal: enabled')).toBeInTheDocument()
    })

    it('should display existing images from form', () => {
      const defaultValues = {
        images: ['image1.jpg', 'image2.jpg']
      }

      render(<TestWrapper defaultValues={defaultValues} />)
      
      expect(screen.getByText('Current images: 2')).toBeInTheDocument()
    })

    it('should propagate image changes to parent', () => {
      const onImagesChange = vi.fn()
      
      render(<TestWrapper onImagesChange={onImagesChange} />)
      
      const addButton = screen.getByText('Add Image')
      addButton.click()

      expect(onImagesChange).toHaveBeenCalledWith(['new-image.jpg'])
    })

    it('should handle background removal completion', () => {
      const onProcessedImagesChange = vi.fn()
      
      render(<TestWrapper onProcessedImagesChange={onProcessedImagesChange} />)
      
      const completeButton = screen.getByText('Complete Background Removal')
      completeButton.click()

      expect(onProcessedImagesChange).toHaveBeenCalledWith('grid.jpg', 'detail.jpg')
    })
  })

  describe('Form Field Behavior', () => {
    it('should update form field when images change', () => {
      const TestFormWrapper = () => {
        const form = useForm<CarListingFormData>({
          defaultValues: {
            images: [],
            processed_image_grid: '',
            processed_image_detail: ''
          }
        })

        const handleImagesChange = (images: string[]) => {
          form.setValue('images', images)
        }

        return (
          <>
            <MediaSectionWithBackgroundRemoval
              control={form.control}
              onImagesChange={handleImagesChange}
              enableBackgroundRemoval={true}
            />
            <div data-testid="form-values">
              {JSON.stringify(form.watch('images'))}
            </div>
          </>
        )
      }

      render(<TestFormWrapper />)
      
      const addButton = screen.getByText('Add Image')
      addButton.click()

      expect(screen.getByTestId('form-values')).toHaveTextContent('["new-image.jpg"]')
    })
  })

  describe('Background Removal Feature', () => {
    it('should pass enableBackgroundRemoval prop correctly', () => {
      const { rerender } = render(
        <TestWrapper />
      )
      
      expect(screen.getByText('Background removal: enabled')).toBeInTheDocument()

      // Test with disabled
      const form = useForm<CarListingFormData>({
        defaultValues: { images: [] }
      })
      
      rerender(
        <MediaSectionWithBackgroundRemoval
          control={form.control}
          onImagesChange={vi.fn()}
          enableBackgroundRemoval={false}
        />
      )
      
      expect(screen.getByText('Background removal: disabled')).toBeInTheDocument()
    })

    it('should handle processed images callback', () => {
      const onProcessedImagesChange = vi.fn()
      const consoleLogSpy = vi.spyOn(console, 'log')
      
      render(<TestWrapper onProcessedImagesChange={onProcessedImagesChange} />)
      
      const completeButton = screen.getByText('Complete Background Removal')
      completeButton.click()

      // Verify console log
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Background removed:',
        expect.objectContaining({
          processed: 'processed.jpg',
          original: 'original.jpg',
          gridUrl: 'grid.jpg',
          detailUrl: 'detail.jpg'
        })
      )

      // Verify callback
      expect(onProcessedImagesChange).toHaveBeenCalledWith('grid.jpg', 'detail.jpg')
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing callbacks gracefully', () => {
      const form = useForm<CarListingFormData>({
        defaultValues: { images: [] }
      })

      // Render without optional callbacks
      render(
        <MediaSectionWithBackgroundRemoval
          control={form.control}
          onImagesChange={vi.fn()}
          // No onProcessedImagesChange provided
        />
      )

      // Should render without errors
      expect(screen.getByTestId('image-upload-component')).toBeInTheDocument()

      // Clicking complete shouldn't cause errors
      const completeButton = screen.getByText('Complete Background Removal')
      expect(() => completeButton.click()).not.toThrow()
    })

    it('should maintain form field connection', () => {
      const form = useForm<CarListingFormData>({
        defaultValues: {
          images: ['existing.jpg'],
          processed_image_grid: 'grid-existing.jpg',
          processed_image_detail: 'detail-existing.jpg'
        }
      })

      render(
        <MediaSectionWithBackgroundRemoval
          control={form.control}
          onImagesChange={vi.fn()}
          onProcessedImagesChange={vi.fn()}
        />
      )

      // Should display existing image count
      expect(screen.getByText('Current images: 1')).toBeInTheDocument()
    })
  })
})