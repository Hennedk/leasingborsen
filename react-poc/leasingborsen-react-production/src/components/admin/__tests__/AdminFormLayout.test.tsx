import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test/test-utils'
import { useForm } from 'react-hook-form'
import { AdminFormLayout } from '../AdminFormLayout'
import type { CarListingFormData } from '@/lib/validations'

// Test component that uses AdminFormLayout
const TestFormComponent = ({ onSubmit }: { onSubmit: vi.Mock }) => {
  const form = useForm<CarListingFormData>({
    defaultValues: {
      make: 'Audi',
      model: 'A3',
      body_type: '',
      fuel_type: '',
      transmission: ''
    }
  })

  return (
    <AdminFormLayout form={form} onSubmit={onSubmit}>
      <div data-testid="form-content">
        <h2>Test Form Content</h2>
        <input {...form.register('make')} data-testid="make-input" />
        <button type="submit" data-testid="submit-button">Submit</button>
      </div>
    </AdminFormLayout>
  )
}

describe('AdminFormLayout', () => {
  const mockOnSubmit = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Form Structure', () => {
    it('renders form with proper structure', () => {
      render(<TestFormComponent onSubmit={mockOnSubmit} />)
      
      // Check that form element exists
      const form = screen.getByRole('form') || screen.getByTestId('form-content').closest('form')
      expect(form).toBeInTheDocument()
      expect(form).toHaveAttribute('novalidate')
    })

    it('renders children content', () => {
      render(<TestFormComponent onSubmit={mockOnSubmit} />)
      
      expect(screen.getByTestId('form-content')).toBeInTheDocument()
      expect(screen.getByText('Test Form Content')).toBeInTheDocument()
    })

    it('applies default CSS classes', () => {
      render(<TestFormComponent onSubmit={mockOnSubmit} />)
      
      const form = screen.getByTestId('form-content').closest('form')
      expect(form).toHaveClass('space-y-8')
    })

    it('applies custom CSS classes when provided', () => {
      const form = useForm<CarListingFormData>()
      
      render(
        <AdminFormLayout form={form} onSubmit={mockOnSubmit} className="custom-class">
          <div>Custom content</div>
        </AdminFormLayout>
      )
      
      const formElement = screen.getByText('Custom content').closest('form')
      expect(formElement).toHaveClass('custom-class')
    })
  })

  describe('Form Submission', () => {
    it('calls onSubmit when form is submitted', async () => {
      render(<TestFormComponent onSubmit={mockOnSubmit} />)
      
      const submitButton = screen.getByTestId('submit-button')
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1)
      })
    })

    it('passes form data to onSubmit handler', async () => {
      render(<TestFormComponent onSubmit={mockOnSubmit} />)
      
      // Change form value
      const makeInput = screen.getByTestId('make-input')
      fireEvent.change(makeInput, { target: { value: 'BMW' } })
      
      const submitButton = screen.getByTestId('submit-button')
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            make: 'BMW'
          })
        )
      })
    })
  })

  describe('Layout Container', () => {
    it('renders with proper container structure', () => {
      render(<TestFormComponent onSubmit={mockOnSubmit} />)
      
      // Check for container with proper classes
      const container = screen.getByTestId('form-content').closest('.container')
      expect(container).toBeInTheDocument()
      expect(container?.parentElement).toHaveClass('min-h-screen', 'bg-background')
    })

    it('includes footer spacing', () => {
      render(<TestFormComponent onSubmit={mockOnSubmit} />)
      
      // Look for the footer spacing div
      const form = screen.getByTestId('form-content').closest('form')
      const footerSpacing = form?.querySelector('.py-8[aria-hidden="true"]')
      expect(footerSpacing).toBeInTheDocument()
    })
  })

  describe('Form Integration', () => {
    it('integrates properly with React Hook Form', () => {
      render(<TestFormComponent onSubmit={mockOnSubmit} />)
      
      const makeInput = screen.getByTestId('make-input')
      expect(makeInput).toHaveValue('Audi') // Default value from form
    })

    it('handles form validation', async () => {
      // Create a form with validation
      const FormWithValidation = () => {
        const form = useForm<CarListingFormData>({
          defaultValues: { make: '' }
        })

        return (
          <AdminFormLayout form={form} onSubmit={mockOnSubmit}>
            <input 
              {...form.register('make', { required: 'Make is required' })} 
              data-testid="required-input"
            />
            <button type="submit">Submit</button>
            {form.formState.errors.make && (
              <span data-testid="error-message">{form.formState.errors.make.message}</span>
            )}
          </AdminFormLayout>
        )
      }

      render(<FormWithValidation />)
      
      const submitButton = screen.getByRole('button', { name: 'Submit' })
      fireEvent.click(submitButton)
      
      // onSubmit should not be called due to validation error
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })
  })
})