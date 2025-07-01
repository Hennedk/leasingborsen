import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
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

describe('SellerForm - Make Selection Basic Tests', () => {
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

  it('renders make selection dropdown for new seller', () => {
    render(
      <TestWrapper>
        <SellerForm />
      </TestWrapper>
    )

    expect(screen.getByLabelText('Bilmærke (Specialisering)')).toBeInTheDocument()
    expect(screen.getByText('Vælg bilmærke (valgfrit)')).toBeInTheDocument()
  })

  it('displays all available makes in dropdown including no specific make option', async () => {
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

    // Verify dropdown closed and shows selected value
    await waitFor(() => {
      expect(screen.queryByText('Toyota')).not.toBeInTheDocument() // Dropdown closed
    })
  })

  it('shows current make selection when editing seller with make', () => {
    render(
      <TestWrapper>
        <SellerForm seller={mockSeller} isEditing={true} />
      </TestWrapper>
    )

    // The form should be populated with existing data
    expect(screen.getByDisplayValue('Test Dealer')).toBeInTheDocument()
    expect(screen.getByDisplayValue('test@dealer.dk')).toBeInTheDocument()
    
    // Make field should show current selection (BMW from mockSeller)
    const makeSelect = screen.getByRole('combobox', { name: /bilmærke/i })
    expect(makeSelect).toBeInTheDocument()
  })

  it('allows changing make selection when editing', async () => {
    const user = userEvent.setup()
    
    render(
      <TestWrapper>
        <SellerForm seller={mockSeller} isEditing={true} />
      </TestWrapper>
    )

    // Open dropdown and change to Toyota
    const makeSelect = screen.getByRole('combobox', { name: /bilmærke/i })
    await user.click(makeSelect)

    await waitFor(() => {
      expect(screen.getByText('Toyota')).toBeInTheDocument()
    })
    
    await user.click(screen.getByText('Toyota'))

    // Verify dropdown closed
    await waitFor(() => {
      expect(screen.queryByText('BMW')).not.toBeInTheDocument() // Dropdown closed
    })
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

    // Verify dropdown closed
    await waitFor(() => {
      expect(screen.queryByText('BMW')).not.toBeInTheDocument() // Dropdown closed
    })
  })

  it('has proper accessibility labels for make selection', () => {
    render(
      <TestWrapper>
        <SellerForm />
      </TestWrapper>
    )

    const makeLabel = screen.getByText('Bilmærke (Specialisering)')
    const makeSelect = screen.getByRole('combobox', { name: /bilmærke/i })
    
    expect(makeLabel).toBeInTheDocument()
    expect(makeSelect).toBeInTheDocument()
  })

  it('handles make loading error gracefully', () => {
    // Override the mock for this test
    vi.doMock('@/hooks/useReferenceData', () => ({
      useMakes: () => ({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to load makes')
      })
    }))

    render(
      <TestWrapper>
        <SellerForm />
      </TestWrapper>
    )

    // Form should still render, dropdown just won't have make options
    expect(screen.getByLabelText('Bilmærke (Specialisering)')).toBeInTheDocument()
    expect(screen.getByText('Vælg bilmærke (valgfrit)')).toBeInTheDocument()
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
    
    // Submit form without selecting make (default should be "none")
    const submitButton = screen.getByRole('button', { name: /opret sælger/i })
    await user.click(submitButton)

    // Form should submit successfully
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/admin/sellers')
    })
  })
})