import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@/test/test-utils'
import { AdminFormHeader } from '../AdminFormHeader'

describe('AdminFormHeader', () => {
  const defaultProps = {
    isEditing: false,
    isLoading: false,
    hasUnsavedChanges: false,
    currentListingId: undefined,
    onCancel: vi.fn(),
    onReset: vi.fn(),
    onSubmit: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Navigation', () => {
    it('renders back button with correct text', () => {
      render(<AdminFormHeader {...defaultProps} />)
      
      const backButton = screen.getByRole('button', { name: /tilbage til annonceoversigt/i })
      expect(backButton).toBeInTheDocument()
      expect(backButton).toHaveTextContent('Tilbage til annoncer')
    })

    it('calls onCancel when back button is clicked', () => {
      render(<AdminFormHeader {...defaultProps} />)
      
      const backButton = screen.getByRole('button', { name: /tilbage til annonceoversigt/i })
      fireEvent.click(backButton)
      
      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1)
    })
  })

  describe('Title Display', () => {
    it('shows create title when not editing', () => {
      render(<AdminFormHeader {...defaultProps} isEditing={false} />)
      
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Opret ny annonce')
    })

    it('shows edit title when editing', () => {
      render(<AdminFormHeader {...defaultProps} isEditing={true} />)
      
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Rediger annonce')
    })
  })

  describe('Save Shortcut Hint', () => {
    it('shows shortcut hint when has unsaved changes', () => {
      render(<AdminFormHeader {...defaultProps} hasUnsavedChanges={true} />)
      
      expect(screen.getByText('Ctrl+S for at gemme')).toBeInTheDocument()
    })

    it('shows shortcut hint when no current listing ID (new listing)', () => {
      render(<AdminFormHeader {...defaultProps} currentListingId={undefined} />)
      
      expect(screen.getByText('Ctrl+S for at gemme')).toBeInTheDocument()
    })

    it('hides shortcut hint when no changes and has listing ID', () => {
      render(<AdminFormHeader {...defaultProps} hasUnsavedChanges={false} currentListingId="existing-id" />)
      
      expect(screen.queryByText('Ctrl+S for at gemme')).not.toBeInTheDocument()
    })
  })

  describe('Submit Button', () => {
    it('shows create text when not editing', () => {
      render(<AdminFormHeader {...defaultProps} isEditing={false} />)
      
      const submitButton = screen.getByRole('button', { name: /opret annonce/i })
      expect(submitButton).toHaveTextContent('Opret bil')
    })

    it('shows edit text when editing', () => {
      render(<AdminFormHeader {...defaultProps} isEditing={true} />)
      
      const submitButton = screen.getByRole('button', { name: /gem ændringer/i })
      expect(submitButton).toHaveTextContent('Gem biloplysninger')
    })

    it('shows loading state when submitting', () => {
      render(<AdminFormHeader {...defaultProps} isLoading={true} />)
      
      const submitButton = screen.getByRole('button', { name: /gemmer annonce/i })
      expect(submitButton).toHaveTextContent('Gemmer...')
      expect(submitButton).toBeDisabled()
    })

    it('is disabled when no changes and has listing ID', () => {
      render(<AdminFormHeader 
        {...defaultProps} 
        hasUnsavedChanges={false} 
        currentListingId="existing-id" 
      />)
      
      const submitButton = screen.getByRole('button', { name: /gem ændringer/i })
      expect(submitButton).toBeDisabled()
    })

    it('is enabled when has unsaved changes', () => {
      render(<AdminFormHeader {...defaultProps} hasUnsavedChanges={true} />)
      
      const submitButton = screen.getByRole('button', { name: /opret annonce/i })
      expect(submitButton).not.toBeDisabled()
    })

    it('calls onSubmit when clicked', () => {
      render(<AdminFormHeader {...defaultProps} hasUnsavedChanges={true} />)
      
      const submitButton = screen.getByRole('button', { name: /opret annonce/i })
      fireEvent.click(submitButton)
      
      expect(defaultProps.onSubmit).toHaveBeenCalledTimes(1)
    })
  })

  describe('Reset Button', () => {
    it('shows reset button only when editing', () => {
      const { rerender } = render(<AdminFormHeader {...defaultProps} isEditing={false} />)
      
      expect(screen.queryByRole('button', { name: /nulstil formular/i })).not.toBeInTheDocument()
      
      rerender(<AdminFormHeader {...defaultProps} isEditing={true} />)
      
      expect(screen.getByRole('button', { name: /nulstil formular/i })).toBeInTheDocument()
    })

    it('is disabled when no unsaved changes', () => {
      render(<AdminFormHeader 
        {...defaultProps} 
        isEditing={true} 
        hasUnsavedChanges={false} 
      />)
      
      const resetButton = screen.getByRole('button', { name: /nulstil formular/i })
      expect(resetButton).toBeDisabled()
    })

    it('is enabled when has unsaved changes', () => {
      render(<AdminFormHeader 
        {...defaultProps} 
        isEditing={true} 
        hasUnsavedChanges={true} 
      />)
      
      const resetButton = screen.getByRole('button', { name: /nulstil formular/i })
      expect(resetButton).not.toBeDisabled()
    })

    it('calls onReset when clicked', () => {
      render(<AdminFormHeader 
        {...defaultProps} 
        isEditing={true} 
        hasUnsavedChanges={true} 
      />)
      
      const resetButton = screen.getByRole('button', { name: /nulstil formular/i })
      fireEvent.click(resetButton)
      
      expect(defaultProps.onReset).toHaveBeenCalledTimes(1)
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels on buttons', () => {
      render(<AdminFormHeader {...defaultProps} isEditing={true} hasUnsavedChanges={true} />)
      
      expect(screen.getByRole('button', { name: /tilbage til annonceoversigt/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /gem ændringer/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /nulstil formular/i })).toBeInTheDocument()
    })

    it('has proper heading structure', () => {
      render(<AdminFormHeader {...defaultProps} />)
      
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toBeInTheDocument()
    })
  })
})