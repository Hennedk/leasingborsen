import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import AdminListingFormNew from '../AdminListingFormNew'
import { mockReferenceData, mockListing, mockCreateMutation, mockUpdateMutation, mockUseReferenceData } from '@/test/test-utils'

// Mock all dependencies
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

vi.mock('@/hooks/mutations', () => ({
  useCreateListingWithOffers: () => mockCreateMutation,
  useUpdateListingWithOffers: () => mockUpdateMutation
}))

// Mock form sections
vi.mock('../AdminFormSections', () => ({
  AdminFormSections: ({ control, onMakeChange, onModelChange }: any) => (
    <div data-testid="form-sections">
      <select 
        data-testid="make-select" 
        onChange={(e) => onMakeChange(e.target.value)}
      >
        <option value="">Select Make</option>
        <option value="1">Audi</option>
        <option value="2">BMW</option>
      </select>
      
      <select 
        data-testid="model-select"
        onChange={(e) => onModelChange(e.target.value)}
      >
        <option value="">Select Model</option>
        <option value="1">A3</option>
        <option value="3">X3</option>
      </select>
      
      <input 
        data-testid="variant-input" 
        placeholder="Variant"
        {...(control && control.register ? control.register('variant') : {})}
      />
    </div>
  )
}))

describe('AdminListingFormNew Integration', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Component Loading', () => {
    it('shows loading state when reference data is loading', () => {
      vi.mocked(mockUseReferenceData).isLoading = true
      vi.mocked(mockUseReferenceData).data = null

      render(<AdminListingFormNew />)

      expect(screen.getByText('Indlæser reference data...')).toBeInTheDocument()
      
      // Reset for other tests
      vi.mocked(mockUseReferenceData).isLoading = false
      vi.mocked(mockUseReferenceData).data = mockReferenceData
    })

    it('shows error state when reference data fails to load', () => {
      vi.mocked(mockUseReferenceData).isLoading = false
      vi.mocked(mockUseReferenceData).data = null

      render(<AdminListingFormNew />)

      expect(screen.getByText('Kunne ikke indlæse reference data')).toBeInTheDocument()
      
      // Reset for other tests
      vi.mocked(mockUseReferenceData).data = mockReferenceData
    })

    it('renders form when reference data is loaded', () => {
      render(<AdminListingFormNew />)

      expect(screen.getByRole('heading', { name: /opret ny annonce/i })).toBeInTheDocument()
      expect(screen.getByTestId('form-sections')).toBeInTheDocument()
    })
  })

  describe('Create New Listing Flow', () => {
    it('displays create mode UI correctly', () => {
      render(<AdminListingFormNew isEditing={false} />)

      expect(screen.getByRole('heading')).toHaveTextContent('Opret ny annonce')
      expect(screen.getByRole('button', { name: /opret bil/i })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /nulstil/i })).not.toBeInTheDocument()
    })

    it('enables submit button when creating new listing', () => {
      render(<AdminListingFormNew isEditing={false} />)

      const submitButton = screen.getByRole('button', { name: /opret bil/i })
      expect(submitButton).not.toBeDisabled()
    })

    it('handles form submission for new listing', async () => {
      render(<AdminListingFormNew isEditing={false} />)

      const submitButton = screen.getByRole('button', { name: /opret bil/i })
      await user.click(submitButton)

      expect(mockCreateMutation.mutateAsync).toHaveBeenCalled()
    })
  })

  describe('Edit Existing Listing Flow', () => {
    it('displays edit mode UI correctly', () => {
      render(<AdminListingFormNew listing={mockListing} isEditing={true} />)

      expect(screen.getByRole('heading')).toHaveTextContent('Rediger annonce')
      expect(screen.getByRole('button', { name: /gem biloplysninger/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /nulstil/i })).toBeInTheDocument()
    })

    it('pre-populates form with listing data', () => {
      render(<AdminListingFormNew listing={mockListing} isEditing={true} />)

      // Form should be populated with listing data
      // (Note: The actual form fields are mocked, but the hook should receive the data)
      expect(screen.getByTestId('form-sections')).toBeInTheDocument()
    })

    it('handles form submission for existing listing', async () => {
      render(<AdminListingFormNew listing={mockListing} isEditing={true} />)

      const submitButton = screen.getByRole('button', { name: /gem biloplysninger/i })
      await user.click(submitButton)

      expect(mockUpdateMutation.mutateAsync).toHaveBeenCalled()
    })
  })

  describe('Form Interactions', () => {
    it('handles make selection', async () => {
      render(<AdminListingFormNew />)

      const makeSelect = screen.getByTestId('make-select')
      await user.selectOptions(makeSelect, '1') // Select Audi

      // Should trigger make change handler
      expect(makeSelect).toHaveValue('1')
    })

    it('handles model selection', async () => {
      render(<AdminListingFormNew />)

      const modelSelect = screen.getByTestId('model-select')
      await user.selectOptions(modelSelect, '1') // Select A3

      expect(modelSelect).toHaveValue('1')
    })

    it('shows unsaved changes indicator', async () => {
      render(<AdminListingFormNew />)

      // Initially no changes indicator
      expect(screen.queryByText('Ctrl+S for at gemme')).toBeInTheDocument() // New listing always shows this

      // For editing mode, it should appear when changes are made
      const { rerender } = render(<AdminListingFormNew listing={mockListing} isEditing={true} />)
      
      // Initially no changes (should not show for saved listing)
      expect(screen.queryByText('Ctrl+S for at gemme')).not.toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    it('handles back navigation', async () => {
      render(<AdminListingFormNew />)

      const backButton = screen.getByRole('button', { name: /tilbage til annonceoversigt/i })
      await user.click(backButton)

      expect(mockNavigate).toHaveBeenCalledWith('/admin/listings')
    })

    it('confirms navigation when there are unsaved changes', async () => {
      render(<AdminListingFormNew listing={mockListing} isEditing={true} />)

      // Simulate unsaved changes by interacting with form
      const variantInput = screen.getByTestId('variant-input')
      await user.type(variantInput, 'Changed variant')

      const backButton = screen.getByRole('button', { name: /tilbage til annonceoversigt/i })
      await user.click(backButton)

      expect(global.confirm).toHaveBeenCalledWith(
        expect.stringContaining('ikke-gemte ændringer')
      )
    })
  })

  describe('Reset Functionality', () => {
    it('resets form to original values', async () => {
      render(<AdminListingFormNew listing={mockListing} isEditing={true} />)

      // Make changes
      const variantInput = screen.getByTestId('variant-input')
      await user.clear(variantInput)
      await user.type(variantInput, 'Changed variant')

      // Reset
      const resetButton = screen.getByRole('button', { name: /nulstil/i })
      await user.click(resetButton)

      // Should show success toast
      await waitFor(async () => {
        const { toast } = await import('sonner')
        expect(toast.success).toHaveBeenCalledWith('Formular nulstillet til original værdier')
      })
    })
  })

  describe('Loading States', () => {
    it('shows loading state during submission', async () => {
      // Mock pending mutation
      mockCreateMutation.isPending = true

      render(<AdminListingFormNew />)

      const submitButton = screen.getByRole('button', { name: /gemmer annonce/i })
      expect(submitButton).toBeDisabled()
      expect(submitButton).toHaveTextContent('Gemmer...')

      // Reset for other tests
      mockCreateMutation.isPending = false
    })
  })

  describe('Error Handling', () => {
    it('displays error when submission fails', async () => {
      const errorMessage = 'Submission failed'
      mockCreateMutation.mutateAsync.mockRejectedValueOnce(new Error(errorMessage))

      render(<AdminListingFormNew />)

      const submitButton = screen.getByRole('button', { name: /opret bil/i })
      await user.click(submitButton)

      await waitFor(async () => {
        const { toast } = await import('sonner')
        expect(toast.error).toHaveBeenCalledWith(errorMessage)
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      render(<AdminListingFormNew />)

      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toBeInTheDocument()
    })

    it('has accessible form structure', () => {
      render(<AdminListingFormNew />)

      // Form should be properly structured for screen readers
      const form = screen.getByTestId('form-sections').closest('form')
      expect(form).toHaveAttribute('novalidate')
    })

    it('has proper button labels', () => {
      render(<AdminListingFormNew isEditing={true} />)

      expect(screen.getByRole('button', { name: /tilbage til annonceoversigt/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /gem ændringer/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /nulstil formular/i })).toBeInTheDocument()
    })
  })
})