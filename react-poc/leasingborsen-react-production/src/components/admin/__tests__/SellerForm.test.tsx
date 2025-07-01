import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import SellerForm from '../SellerForm'
import type { Seller } from '@/hooks/useSellers'

// Mock the hooks
vi.mock('@/hooks/useSellerMutations', () => ({
  useCreateSeller: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false
  }),
  useUpdateSeller: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false
  })
}))

vi.mock('@/hooks/useReferenceData', () => ({
  useMakes: () => ({
    data: [
      { id: 'make-1', name: 'Toyota' },
      { id: 'make-2', name: 'BMW' },
      { id: 'make-3', name: 'Mercedes-Benz' },
      { id: 'make-4', name: 'Audi' }
    ],
    isLoading: false,
    error: null
  })
}))

// Mock navigation
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

// Test wrapper component
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

describe('SellerForm - Make Selection', () => {
  const mockSeller: Seller = {
    id: 'seller-1',
    name: 'Test Dealer',
    email: 'test@dealer.dk',
    phone: '+45 12 34 56 78',
    company: 'Test Dealer ApS',
    address: 'Test Vej 123, 2000 Frederiksberg',
    country: 'Denmark',
    logo_url: 'https://example.com/logo.png',
    make_id: 'make-2',
    make_name: 'BMW'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Create new seller with make selection', () => {
    it('renders make selection dropdown for new seller', () => {
      render(
        <TestWrapper>
          <SellerForm />
        </TestWrapper>
      )

      expect(screen.getByLabelText('Bilmærke (Specialisering)')).toBeInTheDocument()
      expect(screen.getByText('Vælg bilmærke (valgfrit)')).toBeInTheDocument()
    })

    it('allows selecting a make when creating new seller', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <SellerForm />
        </TestWrapper>
      )

      // Fill in required fields
      await user.type(screen.getByLabelText('Navn *'), 'New Dealer')
      
      // Open make selection dropdown
      const makeSelect = screen.getByRole('combobox', { name: /bilmærke/i })
      await user.click(makeSelect)

      // Wait for dropdown to open and select BMW
      await waitFor(() => {
        expect(screen.getByText('BMW')).toBeInTheDocument()
      })
      
      await user.click(screen.getByText('BMW'))

      // Verify selection
      expect(screen.getByDisplayValue('BMW')).toBeInTheDocument()
    })

    it('allows creating seller without selecting a make', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <SellerForm />
        </TestWrapper>
      )

      // Fill in required fields only
      await user.type(screen.getByLabelText('Navn *'), 'Multi-Brand Dealer')
      
      // Submit form without selecting make
      const submitButton = screen.getByRole('button', { name: /opret sælger/i })
      await user.click(submitButton)

      // Form should submit successfully (make_id will be undefined/empty)
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/admin/sellers')
      })
    })

    it('displays all available makes in dropdown', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <SellerForm />
        </TestWrapper>
      )

      // Open make selection dropdown
      const makeSelect = screen.getByRole('combobox', { name: /bilmærke/i })
      await user.click(makeSelect)

      // Check all makes are present
      await waitFor(() => {
        expect(screen.getByText('Intet specifikt mærke')).toBeInTheDocument()
        expect(screen.getByText('Toyota')).toBeInTheDocument()
        expect(screen.getByText('BMW')).toBeInTheDocument()
        expect(screen.getByText('Mercedes-Benz')).toBeInTheDocument()
        expect(screen.getByText('Audi')).toBeInTheDocument()
      })
    })
  })

  describe('Edit existing seller with make', () => {
    it('shows current make selection when editing seller', () => {
      render(
        <TestWrapper>
          <SellerForm seller={mockSeller} isEditing={true} />
        </TestWrapper>
      )

      // Should show BMW as selected (from mockSeller.make_name)
      const makeSelect = screen.getByDisplayValue('BMW')
      expect(makeSelect).toBeInTheDocument()
    })

    it('allows changing make selection when editing', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <SellerForm seller={mockSeller} isEditing={true} />
        </TestWrapper>
      )

      // Current selection should be BMW
      expect(screen.getByDisplayValue('BMW')).toBeInTheDocument()

      // Open dropdown and change to Toyota
      const makeSelect = screen.getByRole('combobox', { name: /bilmærke/i })
      await user.click(makeSelect)

      await waitFor(() => {
        expect(screen.getByText('Toyota')).toBeInTheDocument()
      })
      
      await user.click(screen.getByText('Toyota'))

      // Verify new selection
      expect(screen.getByDisplayValue('Toyota')).toBeInTheDocument()
    })

    it('allows removing make selection (set to no specific make)', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <SellerForm seller={mockSeller} isEditing={true} />
        </TestWrapper>
      )

      // Open dropdown and select "no specific make"
      const makeSelect = screen.getByRole('combobox', { name: /bilmærke/i })
      await user.click(makeSelect)

      await waitFor(() => {
        expect(screen.getByText('Intet specifikt mærke')).toBeInTheDocument()
      })
      
      await user.click(screen.getByText('Intet specifikt mærke'))

      // Verify make is cleared
      expect(screen.getByText('Vælg bilmærke (valgfrit)')).toBeInTheDocument()
    })
  })

  describe('Form validation and submission', () => {
    it('includes make_id in form data when submitting new seller', async () => {
      const mockCreateMutation = vi.fn().mockResolvedValue({})
      
      // Re-mock the hook for this test
      vi.doMock('@/hooks/useSellerMutations', () => ({
        useCreateSeller: () => ({
          mutateAsync: mockCreateMutation,
          isPending: false,
          isError: false,
          error: null,
          data: undefined,
          isSuccess: false,
          mutate: vi.fn(),
          reset: vi.fn()
        }),
        useUpdateSeller: () => ({
          mutateAsync: vi.fn().mockResolvedValue({}),
          isPending: false
        })
      }))

      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <SellerForm />
        </TestWrapper>
      )

      // Fill form with make selection
      await user.type(screen.getByLabelText('Navn *'), 'Toyota Dealer')
      
      // Select Toyota
      const makeSelect = screen.getByRole('combobox', { name: /bilmærke/i })
      await user.click(makeSelect)
      await user.click(screen.getByText('Toyota'))

      // Submit form
      const submitButton = screen.getByRole('button', { name: /opret sælger/i })
      await user.click(submitButton)

      // Verify mutation was called with make_id
      await waitFor(() => {
        expect(mockCreateMutation).toHaveBeenCalledWith({
          name: 'Toyota Dealer',
          make_id: 'make-1', // Toyota's ID from mock data
          email: undefined,
          phone: undefined,
          company: undefined,
          address: undefined,
          country: undefined,
          logo_url: undefined
        })
      })
    })

    it('includes make_id as undefined when no make is selected', async () => {
      const mockCreateMutation = vi.fn().mockResolvedValue({})
      const { useCreateSeller } = await import('@/hooks/useSellerMutations')
      
      vi.mocked(useCreateSeller).mockReturnValue({
        mutateAsync: mockCreateMutation,
        isPending: false,
        isError: false,
        error: null,
        data: undefined,
        isSuccess: false,
        mutate: vi.fn(),
        reset: vi.fn()
      } as any)

      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <SellerForm />
        </TestWrapper>
      )

      // Fill only required field
      await user.type(screen.getByLabelText('Navn *'), 'Multi-Brand Dealer')

      // Submit without selecting make
      const submitButton = screen.getByRole('button', { name: /opret sælger/i })
      await user.click(submitButton)

      // Verify mutation was called with undefined make_id
      await waitFor(() => {
        expect(mockCreateMutation).toHaveBeenCalledWith({
          name: 'Multi-Brand Dealer',
          make_id: undefined,
          email: undefined,
          phone: undefined,
          company: undefined,
          address: undefined,
          country: undefined,
          logo_url: undefined
        })
      })
    })
  })

  describe('Loading states', () => {
    it('shows loading state when makes are being fetched', () => {
      const { useMakes } = require('@/hooks/useReferenceData')
      vi.mocked(useMakes).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null
      })

      render(
        <TestWrapper>
          <SellerForm />
        </TestWrapper>
      )

      const makeSelect = screen.getByRole('combobox', { name: /bilmærke/i })
      expect(makeSelect).toBeInTheDocument()
      
      // Dropdown should be present but empty while loading
      expect(screen.getByText('Vælg bilmærke (valgfrit)')).toBeInTheDocument()
    })

    it('handles make loading error gracefully', () => {
      const { useMakes } = require('@/hooks/useReferenceData')
      vi.mocked(useMakes).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to load makes')
      })

      render(
        <TestWrapper>
          <SellerForm />
        </TestWrapper>
      )

      // Form should still render, dropdown just won't have make options
      expect(screen.getByLabelText('Bilmærke (Specialisering)')).toBeInTheDocument()
      expect(screen.getByText('Vælg bilmærke (valgfrit)')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper labels and aria attributes for make selection', () => {
      render(
        <TestWrapper>
          <SellerForm />
        </TestWrapper>
      )

      const makeLabel = screen.getByText('Bilmærke (Specialisering)')
      const makeSelect = screen.getByRole('combobox', { name: /bilmærke/i })
      
      expect(makeLabel).toBeInTheDocument()
      expect(makeSelect).toBeInTheDocument()
      expect(makeSelect).toHaveAttribute('aria-label', expect.stringContaining('Bilmærke'))
    })

    it('maintains keyboard navigation for make selection', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <SellerForm />
        </TestWrapper>
      )

      const makeSelect = screen.getByRole('combobox', { name: /bilmærke/i })
      
      // Should be able to focus with keyboard
      await user.tab()
      await user.tab() // Navigate to make field (after name field)
      await user.tab() // Navigate to make field
      
      // Press Enter to open dropdown
      await user.keyboard('{Enter}')
      
      // Should be able to navigate with arrow keys
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{Enter}')
      
      // Selection should work
      expect(makeSelect).toHaveAttribute('aria-expanded', 'false')
    })
  })
})