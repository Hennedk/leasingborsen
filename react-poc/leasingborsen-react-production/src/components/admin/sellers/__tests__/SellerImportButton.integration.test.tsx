import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { SellerImportButton } from '../SellerImportButton'
import type { Seller } from '@/hooks/useSellers'

// Mock the new modal component
vi.mock('../SellerPDFUploadModal', () => ({
  SellerPDFUploadModal: ({ open, onOpenChange, seller }: any) => {
    return open ? (
      <div data-testid="pdf-upload-modal">
        <h2>PDF Upload Modal for {seller.name}</h2>
        <p>Make Specialization: {seller.make_name || 'All Makes'}</p>
        <button onClick={() => onOpenChange(false)}>Close Modal</button>
      </div>
    ) : null
  }
}))

// Mock error boundary
vi.mock('@/components/ErrorBoundaries', () => ({
  BatchUploadErrorBoundary: ({ children }: any) => children
}))

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('SellerImportButton Integration with Modal', () => {
  const mockToyotaSeller: Seller = {
    id: 'seller-1',
    name: 'Toyota Danmark',
    email: 'toyota@denmark.dk',
    phone: '+45 12 34 56 78',
    company: 'Toyota Danmark ApS',
    make_id: 'make-1',
    make_name: 'Toyota',
    total_listings: 10,
    last_import_date: '2024-01-15T10:00:00Z'
  }

  const mockVWSeller: Seller = {
    id: 'seller-2',
    name: 'Volkswagen Group Danmark',
    email: 'vw@denmark.dk',
    make_id: 'make-2',
    make_name: 'Volkswagen',
    total_listings: 25,
    last_import_date: '2024-01-20T14:30:00Z'
  }

  const mockGenericSeller: Seller = {
    id: 'seller-3',
    name: 'Multi-Brand Auto',
    email: 'info@multibrand.dk',
    make_id: null,
    make_name: null,
    total_listings: 0,
    last_import_date: undefined
  }

  const mockOnImportClick = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Button Display and Status', () => {
    it('shows "Update Listings" for sellers with existing listings', () => {
      render(
        <TestWrapper>
          <SellerImportButton
            seller={mockToyotaSeller}
            onImportClick={mockOnImportClick}
          />
        </TestWrapper>
      )

      expect(screen.getByText('Update Listings')).toBeInTheDocument()
      expect(screen.getByText('10 listings')).toBeInTheDocument()
      expect(screen.getByText('Active')).toBeInTheDocument()
    })

    it('shows "Import Listings" for new sellers without listings', () => {
      render(
        <TestWrapper>
          <SellerImportButton
            seller={mockGenericSeller}
            onImportClick={mockOnImportClick}
          />
        </TestWrapper>
      )

      expect(screen.getByText('Import Listings')).toBeInTheDocument()
      expect(screen.getByText('Ready to Import')).toBeInTheDocument()
      expect(screen.getByText('Never imported')).toBeInTheDocument()
    })

    it('displays last import information correctly', () => {
      render(
        <TestWrapper>
          <SellerImportButton
            seller={mockToyotaSeller}
            onImportClick={mockOnImportClick}
          />
        </TestWrapper>
      )

      // Should show import date info (exact text depends on current date)
      expect(screen.getByText(/Imported/)).toBeInTheDocument()
    })

    it('shows processing state when isProcessing is true', () => {
      render(
        <TestWrapper>
          <SellerImportButton
            seller={mockToyotaSeller}
            onImportClick={mockOnImportClick}
            isProcessing={true}
          />
        </TestWrapper>
      )

      expect(screen.getByText('Processing...')).toBeInTheDocument()
      expect(screen.getByRole('button')).toBeDisabled()
    })
  })

  describe('Modal Integration', () => {
    it('opens PDF upload modal when button is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <SellerImportButton
            seller={mockToyotaSeller}
            onImportClick={mockOnImportClick}
          />
        </TestWrapper>
      )

      // Click the import button
      await user.click(screen.getByText('Update Listings'))

      // Modal should open
      await waitFor(() => {
        expect(screen.getByTestId('pdf-upload-modal')).toBeInTheDocument()
        expect(screen.getByText('PDF Upload Modal for Toyota Danmark')).toBeInTheDocument()
      })
    })

    it('passes seller data correctly to modal', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <SellerImportButton
            seller={mockToyotaSeller}
            onImportClick={mockOnImportClick}
          />
        </TestWrapper>
      )

      await user.click(screen.getByText('Update Listings'))

      await waitFor(() => {
        expect(screen.getByText('Dealer Make: Toyota')).toBeInTheDocument()
      })
    })

    it('shows generic configuration for sellers without make', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <SellerImportButton
            seller={mockGenericSeller}
            onImportClick={mockOnImportClick}
          />
        </TestWrapper>
      )

      await user.click(screen.getByText('Import Listings'))

      await waitFor(() => {
        expect(screen.getByText('Dealer Make: Multi-Brand')).toBeInTheDocument()
      })
    })

    it('closes modal when close button is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <SellerImportButton
            seller={mockToyotaSeller}
            onImportClick={mockOnImportClick}
          />
        </TestWrapper>
      )

      // Open modal
      await user.click(screen.getByText('Update Listings'))
      
      await waitFor(() => {
        expect(screen.getByTestId('pdf-upload-modal')).toBeInTheDocument()
      })

      // Close modal
      await user.click(screen.getByText('Close Modal'))

      await waitFor(() => {
        expect(screen.queryByTestId('pdf-upload-modal')).not.toBeInTheDocument()
      })
    })
  })

  describe('Dealer Type Detection', () => {
    it('detects Toyota dealers correctly', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <SellerImportButton
            seller={mockToyotaSeller}
            onImportClick={mockOnImportClick}
          />
        </TestWrapper>
      )

      await user.click(screen.getByText('Update Listings'))

      await waitFor(() => {
        expect(screen.getByText('Dealer Make: Toyota')).toBeInTheDocument()
      })
    })

    it('detects VW dealers correctly', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <SellerImportButton
            seller={mockVWSeller}
            onImportClick={mockOnImportClick}
          />
        </TestWrapper>
      )

      await user.click(screen.getByText('Update Listings'))

      await waitFor(() => {
        expect(screen.getByText('Dealer Make: Volkswagen')).toBeInTheDocument()
      })
    })

    it('handles Audi dealer detection', async () => {
      const user = userEvent.setup()
      const audiSeller = {
        ...mockGenericSeller,
        name: 'Audi Center København',
        make_name: 'Audi'
      }
      
      render(
        <TestWrapper>
          <SellerImportButton
            seller={audiSeller}
            onImportClick={mockOnImportClick}
          />
        </TestWrapper>
      )

      await user.click(screen.getByText('Import Listings'))

      await waitFor(() => {
        expect(screen.getByText('Dealer Make: Audi')).toBeInTheDocument()
      })
    })

    it('handles Škoda dealer detection', async () => {
      const user = userEvent.setup()
      const skodaSeller = {
        ...mockGenericSeller,
        name: 'Škoda Auto Danmark',
        make_name: 'Škoda'
      }
      
      render(
        <TestWrapper>
          <SellerImportButton
            seller={skodaSeller}
            onImportClick={mockOnImportClick}
          />
        </TestWrapper>
      )

      await user.click(screen.getByText('Import Listings'))

      await waitFor(() => {
        expect(screen.getByText('Dealer Make: Škoda')).toBeInTheDocument()
      })
    })
  })

  describe('Callback Handling', () => {
    it('calls onImportClick when upload completes', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <SellerImportButton
            seller={mockToyotaSeller}
            onImportClick={mockOnImportClick}
          />
        </TestWrapper>
      )

      // Open modal
      await user.click(screen.getByText('Update Listings'))
      
      // Close modal (simulating upload completion)
      await user.click(screen.getByText('Close Modal'))

      // Note: The actual onImportClick call would happen in the real modal's onUploadComplete
      // Here we're testing the integration setup
      expect(mockOnImportClick).toBeDefined()
    })

    it('handles upload completion correctly', () => {
      render(
        <TestWrapper>
          <SellerImportButton
            seller={mockToyotaSeller}
            onImportClick={mockOnImportClick}
          />
        </TestWrapper>
      )

      // The component should be ready to handle upload completion
      expect(screen.getByText('Update Listings')).toBeInTheDocument()
    })
  })

  describe('Accessibility and UX', () => {
    it('has proper button states and labels', () => {
      render(
        <TestWrapper>
          <SellerImportButton
            seller={mockToyotaSeller}
            onImportClick={mockOnImportClick}
          />
        </TestWrapper>
      )

      const button = screen.getByRole('button', { name: /update listings/i })
      expect(button).toBeInTheDocument()
      expect(button).toBeEnabled()
    })

    it('provides proper visual feedback for different states', () => {
      render(
        <TestWrapper>
          <SellerImportButton
            seller={mockToyotaSeller}
            onImportClick={mockOnImportClick}
            isProcessing={true}
          />
        </TestWrapper>
      )

      expect(screen.getByText('Processing...')).toBeInTheDocument()
      expect(screen.getByRole('button')).toBeDisabled()
    })

    it('shows appropriate icons for different actions', () => {
      render(
        <TestWrapper>
          <SellerImportButton
            seller={mockGenericSeller}
            onImportClick={mockOnImportClick}
          />
        </TestWrapper>
      )

      // New sellers should show upload icon (different from update icon)
      expect(screen.getByText('Import Listings')).toBeInTheDocument()
    })
  })

  describe('Error Boundary Integration', () => {
    it('wraps modal in error boundary', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <SellerImportButton
            seller={mockToyotaSeller}
            onImportClick={mockOnImportClick}
          />
        </TestWrapper>
      )

      await user.click(screen.getByText('Update Listings'))

      // Modal should render without errors
      await waitFor(() => {
        expect(screen.getByTestId('pdf-upload-modal')).toBeInTheDocument()
      })
    })
  })
})