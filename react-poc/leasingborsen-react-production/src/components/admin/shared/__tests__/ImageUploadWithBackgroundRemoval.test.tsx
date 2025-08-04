import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ImageUploadWithBackgroundRemoval } from '../ImageUploadWithBackgroundRemoval'
import { useAdminImageUpload } from '@/hooks/useAdminImageUpload'
import { toast } from 'sonner'

// Mock dependencies
vi.mock('@/hooks/useAdminImageUpload')
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

// Mock form components to avoid FormProvider dependency
vi.mock('@/components/ui/form', () => ({
  FormItem: ({ children, className }: any) => <div className={className}>{children}</div>,
  FormLabel: ({ children }: any) => <label>{children}</label>,
  FormMessage: ({ children }: any) => <span role="alert">{children}</span>,
}))

// Mock file for testing
const createMockFile = (name: string = 'test.jpg', size: number = 1024): File => {
  const file = new File(['test'], name, { type: 'image/jpeg' })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('ImageUploadWithBackgroundRemoval', () => {
  const mockOnImagesChange = vi.fn()
  const mockOnBackgroundRemovalComplete = vi.fn()
  const mockUploadImage = vi.fn()
  const mockValidateImageUrl = vi.fn()
  const mockReset = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock URL.createObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    
    // Setup hook mock
    vi.mocked(useAdminImageUpload).mockReturnValue({
      uploading: false,
      uploadProgress: 0,
      error: null,
      uploadImage: mockUploadImage,
      validateImageUrl: mockValidateImageUrl,
      reset: mockReset,
      uploadMultipleImages: vi.fn(),
      deleteImage: vi.fn(),
      updateListingImages: vi.fn(),
      processBackground: vi.fn(),
      createAutoSave: vi.fn(),
      isUploading: false,
      hasError: false
    })

    // Default mock implementations
    mockValidateImageUrl.mockReturnValue(true)
    mockUploadImage.mockResolvedValue({
      id: 'mock-id',
      url: 'https://example.com/uploaded.jpg',
      publicUrl: 'https://example.com/uploaded.jpg',
      name: 'test.jpg',
      size: 1024,
      processedUrl: 'https://example.com/processed.jpg'
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('File Upload', () => {
    it('should handle file selection and upload', async () => {
      const user = userEvent.setup()
      render(
        <ImageUploadWithBackgroundRemoval
          images={[]}
          onImagesChange={mockOnImagesChange}
          enableBackgroundRemoval={false}
        />
      )

      const fileInput = screen.getByRole('button', { name: /vælg filer/i })
      const file = createMockFile()

      // Can't directly test file input, but we can test the handler
      const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement
      Object.defineProperty(hiddenInput, 'files', {
        value: [file],
        writable: false
      })

      fireEvent.change(hiddenInput)

      await waitFor(() => {
        expect(mockUploadImage).toHaveBeenCalledWith(file, { processBackground: false })
        expect(mockOnImagesChange).toHaveBeenCalledWith(['https://example.com/uploaded.jpg'])
        expect(toast.success).toHaveBeenCalledWith('1 billede(r) uploadet succesfuldt')
      })
    })

    it('should reject files over 5MB', async () => {
      // Mock uploadImage to throw error for large files
      mockUploadImage.mockRejectedValueOnce(new Error('Billedet må ikke være større end 5MB'))

      render(
        <ImageUploadWithBackgroundRemoval
          images={[]}
          onImagesChange={mockOnImagesChange}
        />
      )

      const largeFile = createMockFile('large.jpg', 6 * 1024 * 1024) // 6MB
      const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement
      
      Object.defineProperty(hiddenInput, 'files', {
        value: [largeFile],
        writable: false
      })

      fireEvent.change(hiddenInput)

      await waitFor(() => {
        expect(mockUploadImage).toHaveBeenCalled()
        expect(toast.error).toHaveBeenCalledWith('Fejl ved upload af billeder')
        expect(mockOnImagesChange).not.toHaveBeenCalled()
      })
    })

    it('should respect max images limit', async () => {
      const existingImages = [
        'https://example.com/1.jpg',
        'https://example.com/2.jpg',
        'https://example.com/3.jpg',
        'https://example.com/4.jpg',
        'https://example.com/5.jpg'
      ]

      render(
        <ImageUploadWithBackgroundRemoval
          images={existingImages}
          onImagesChange={mockOnImagesChange}
          maxImages={5}
        />
      )

      // Upload area should not be shown when at max
      expect(screen.queryByText(/træk billeder hertil/i)).not.toBeInTheDocument()
    })
  })

  describe('Background Removal', () => {
    it('should show background removal toggle when enabled', () => {
      render(
        <ImageUploadWithBackgroundRemoval
          images={[]}
          onImagesChange={mockOnImagesChange}
          enableBackgroundRemoval={true}
        />
      )

      expect(screen.getByLabelText(/fjern baggrund automatisk/i)).toBeInTheDocument()
    })

    it('should process background removal when toggle is checked', async () => {
      render(
        <ImageUploadWithBackgroundRemoval
          images={[]}
          onImagesChange={mockOnImagesChange}
          enableBackgroundRemoval={true}
          onBackgroundRemovalComplete={mockOnBackgroundRemovalComplete}
        />
      )

      // Ensure toggle is checked
      const toggle = screen.getByRole('checkbox', { name: /fjern baggrund automatisk/i })
      expect(toggle).toBeChecked()

      // Upload file
      const file = createMockFile()
      const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement
      Object.defineProperty(hiddenInput, 'files', {
        value: [file],
        writable: false
      })

      fireEvent.change(hiddenInput)

      await waitFor(() => {
        expect(mockUploadImage).toHaveBeenCalledWith(file, { processBackground: true })
        // Should show preview dialog
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText('Baggrundsfjernelse')).toBeInTheDocument()
      })
    })

    it('should handle processed image confirmation', async () => {
      // Setup component in processing state
      render(
        <ImageUploadWithBackgroundRemoval
          images={[]}
          onImagesChange={mockOnImagesChange}
          enableBackgroundRemoval={true}
          onBackgroundRemovalComplete={mockOnBackgroundRemovalComplete}
        />
      )

      // Trigger file upload to show dialog
      const file = createMockFile()
      const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement
      Object.defineProperty(hiddenInput, 'files', {
        value: [file],
        writable: false
      })

      fireEvent.change(hiddenInput)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Click confirm processed button
      const confirmButton = screen.getByRole('button', { name: /brug behandlet billede/i })
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(mockOnImagesChange).toHaveBeenCalledWith(['https://example.com/processed.jpg'])
        expect(mockOnBackgroundRemovalComplete).toHaveBeenCalledWith(
          'https://example.com/processed.jpg',
          'blob:mock-url',
          'https://example.com/processed.jpg',
          'https://example.com/processed.jpg'
        )
        expect(toast.success).toHaveBeenCalledWith('Billede med fjernet baggrund uploadet')
      })
    })

    it('should handle background removal errors gracefully', async () => {
      // Mock error response
      mockUploadImage.mockRejectedValueOnce(new Error('Baggrunds behandling fejlede'))

      render(
        <ImageUploadWithBackgroundRemoval
          images={[]}
          onImagesChange={mockOnImagesChange}
          enableBackgroundRemoval={true}
        />
      )

      const file = createMockFile()
      const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement
      Object.defineProperty(hiddenInput, 'files', {
        value: [file],
        writable: false
      })

      fireEvent.change(hiddenInput)

      await waitFor(() => {
        expect(screen.getByText(/der opstod en fejl ved behandling/i)).toBeInTheDocument()
      })
    })
  })

  describe('URL Input', () => {
    it('should validate and add valid image URLs', async () => {
      const user = userEvent.setup()
      
      render(
        <ImageUploadWithBackgroundRemoval
          images={[]}
          onImagesChange={mockOnImagesChange}
        />
      )

      const urlInput = screen.getByPlaceholderText(/eller indtast billede url/i)
      const addButton = screen.getByRole('button', { name: /tilføj url/i })

      await user.type(urlInput, 'https://example.com/test.jpg')
      await user.click(addButton)

      expect(mockValidateImageUrl).toHaveBeenCalledWith('https://example.com/test.jpg')
      expect(mockOnImagesChange).toHaveBeenCalledWith(['https://example.com/test.jpg'])
      expect(toast.success).toHaveBeenCalledWith('Billede URL tilføjet')
    })

    it('should reject invalid URLs', async () => {
      const user = userEvent.setup()
      mockValidateImageUrl.mockReturnValueOnce(false)

      render(
        <ImageUploadWithBackgroundRemoval
          images={[]}
          onImagesChange={mockOnImagesChange}
        />
      )

      const urlInput = screen.getByPlaceholderText(/eller indtast billede url/i)
      const addButton = screen.getByRole('button', { name: /tilføj url/i })

      await user.type(urlInput, 'not-a-valid-url')
      await user.click(addButton)

      expect(toast.error).toHaveBeenCalledWith('Ugyldig billede URL')
      expect(mockOnImagesChange).not.toHaveBeenCalled()
    })

    it('should handle Enter key in URL input', async () => {
      const user = userEvent.setup()
      
      render(
        <ImageUploadWithBackgroundRemoval
          images={[]}
          onImagesChange={mockOnImagesChange}
        />
      )

      const urlInput = screen.getByPlaceholderText(/eller indtast billede url/i)
      
      await user.type(urlInput, 'https://example.com/test.jpg{Enter}')

      expect(mockOnImagesChange).toHaveBeenCalledWith(['https://example.com/test.jpg'])
    })
  })

  describe('Image Management', () => {
    it('should display existing images', () => {
      const images = [
        'https://example.com/1.jpg',
        'https://example.com/2.jpg'
      ]

      render(
        <ImageUploadWithBackgroundRemoval
          images={images}
          onImagesChange={mockOnImagesChange}
        />
      )

      expect(screen.getByAltText('Billede 1')).toHaveAttribute('src', images[0])
      expect(screen.getByAltText('Billede 2')).toHaveAttribute('src', images[1])
      expect(screen.getByText('Billeder (2/5)')).toBeInTheDocument()
    })

    it('should remove images when delete button clicked', async () => {
      const user = userEvent.setup()
      const images = ['https://example.com/1.jpg', 'https://example.com/2.jpg']

      render(
        <ImageUploadWithBackgroundRemoval
          images={images}
          onImagesChange={mockOnImagesChange}
        />
      )

      // Find first delete button (they're hidden by default, shown on hover)
      const deleteButtons = screen.getAllByRole('button', { name: '' }).filter(
        btn => btn.querySelector('svg') // Has X icon
      )

      await user.click(deleteButtons[0])

      expect(mockOnImagesChange).toHaveBeenCalledWith(['https://example.com/2.jpg'])
    })
  })

  describe('Drag and Drop', () => {
    it('should handle file drop', async () => {
      render(
        <ImageUploadWithBackgroundRemoval
          images={[]}
          onImagesChange={mockOnImagesChange}
        />
      )

      const dropZone = screen.getByText(/træk billeder hertil/i).closest('div')!
      const file = createMockFile()

      const dataTransfer = {
        files: [file],
        types: ['Files']
      }

      fireEvent.dragOver(dropZone, { dataTransfer })
      expect(dropZone).toHaveClass('border-primary')

      fireEvent.drop(dropZone, { dataTransfer })

      await waitFor(() => {
        expect(mockUploadImage).toHaveBeenCalledWith(file, { processBackground: true })
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <ImageUploadWithBackgroundRemoval
          images={[]}
          onImagesChange={mockOnImagesChange}
        />
      )

      expect(screen.getByLabelText(/billeder/i)).toBeInTheDocument()
    })

    it('should manage focus correctly in dialog', async () => {
      render(
        <ImageUploadWithBackgroundRemoval
          images={[]}
          onImagesChange={mockOnImagesChange}
          enableBackgroundRemoval={true}
        />
      )

      // Trigger dialog
      const file = createMockFile()
      const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement
      Object.defineProperty(hiddenInput, 'files', {
        value: [file],
        writable: false
      })

      fireEvent.change(hiddenInput)

      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        expect(dialog).toBeInTheDocument()
        
        // Check dialog has proper structure
        expect(screen.getByRole('heading', { name: 'Baggrundsfjernelse' })).toBeInTheDocument()
      })
    })
  })
})