import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { SellerPDFUploadModal } from '../SellerPDFUploadModal'
import type { Seller } from '@/hooks/useSellers'

// Mock dependencies
vi.mock('@/hooks/useJobProgress', () => ({
  useJobProgress: vi.fn(() => ({
    startPolling: vi.fn()
  }))
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
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

describe('VW Group Display Fix', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('displays Škoda make specialization correctly', () => {
    const skodaSeller: Seller = {
      id: 'seller-skoda',
      name: 'Škoda Auto Danmark',
      make_id: 'make-skoda',
      make_name: 'Škoda'
    }

    render(
      <TestWrapper>
        <SellerPDFUploadModal
          open={true}
          onOpenChange={vi.fn()}
          seller={skodaSeller}
        />
      </TestWrapper>
    )

    expect(screen.getByText('Škoda')).toBeInTheDocument()
    expect(screen.getByText('Dealer Make:')).toBeInTheDocument()
    expect(screen.queryByText('volkswagen')).not.toBeInTheDocument()
  })

  it('displays Audi make specialization correctly', () => {
    const audiSeller: Seller = {
      id: 'seller-audi',
      name: 'Audi Center København',
      make_id: 'make-audi',
      make_name: 'Audi'
    }

    render(
      <TestWrapper>
        <SellerPDFUploadModal
          open={true}
          onOpenChange={vi.fn()}
          seller={audiSeller}
        />
      </TestWrapper>
    )

    expect(screen.getByText('Audi')).toBeInTheDocument()
    expect(screen.getByText('Dealer Make:')).toBeInTheDocument()
    expect(screen.queryByText('volkswagen')).not.toBeInTheDocument()
  })

  it('displays SEAT make specialization correctly', () => {
    const seatSeller: Seller = {
      id: 'seller-seat',
      name: 'SEAT Danmark',
      make_id: 'make-seat',
      make_name: 'SEAT'
    }

    render(
      <TestWrapper>
        <SellerPDFUploadModal
          open={true}
          onOpenChange={vi.fn()}
          seller={seatSeller}
        />
      </TestWrapper>
    )

    expect(screen.getByText('SEAT')).toBeInTheDocument()
    expect(screen.getByText('Dealer Make:')).toBeInTheDocument()
    expect(screen.queryByText('volkswagen')).not.toBeInTheDocument()
  })

  it('displays Cupra make specialization correctly', () => {
    const cupraSeller: Seller = {
      id: 'seller-cupra',
      name: 'Cupra Danmark',
      make_id: 'make-cupra',
      make_name: 'Cupra'
    }

    render(
      <TestWrapper>
        <SellerPDFUploadModal
          open={true}
          onOpenChange={vi.fn()}
          seller={cupraSeller}
        />
      </TestWrapper>
    )

    expect(screen.getByText('Cupra')).toBeInTheDocument()
    expect(screen.getByText('Dealer Make:')).toBeInTheDocument()
    expect(screen.queryByText('volkswagen')).not.toBeInTheDocument()
  })

  it('displays Volkswagen make specialization correctly', () => {
    const vwSeller: Seller = {
      id: 'seller-vw',
      name: 'Volkswagen Danmark',
      make_id: 'make-vw',
      make_name: 'Volkswagen'
    }

    render(
      <TestWrapper>
        <SellerPDFUploadModal
          open={true}
          onOpenChange={vi.fn()}
          seller={vwSeller}
        />
      </TestWrapper>
    )

    expect(screen.getByText('Volkswagen')).toBeInTheDocument()
    expect(screen.getByText('Dealer Make:')).toBeInTheDocument()
  })

  it('displays Toyota make specialization correctly', () => {
    const toyotaSeller: Seller = {
      id: 'seller-toyota',
      name: 'Toyota Danmark',
      make_id: 'make-toyota',
      make_name: 'Toyota'
    }

    render(
      <TestWrapper>
        <SellerPDFUploadModal
          open={true}
          onOpenChange={vi.fn()}
          seller={toyotaSeller}
        />
      </TestWrapper>
    )

    expect(screen.getByText('Toyota')).toBeInTheDocument()
    expect(screen.getByText('Dealer Make:')).toBeInTheDocument()
  })

  it('displays All Makes for generic dealers', () => {
    const genericSeller: Seller = {
      id: 'seller-generic',
      name: 'Multi Brand Auto',
      make_id: null,
      make_name: null
    }

    render(
      <TestWrapper>
        <SellerPDFUploadModal
          open={true}
          onOpenChange={vi.fn()}
          seller={genericSeller}
        />
      </TestWrapper>
    )

    expect(screen.getByText('Multi-Brand')).toBeInTheDocument()
    expect(screen.getByText('Dealer Make:')).toBeInTheDocument()
  })

  it('shows correct labels for configuration', () => {
    const skodaSeller: Seller = {
      id: 'seller-skoda',
      name: 'Škoda Auto Danmark',
      make_id: 'make-skoda',
      make_name: 'Škoda'
    }

    render(
      <TestWrapper>
        <SellerPDFUploadModal
          open={true}
          onOpenChange={vi.fn()}
          seller={skodaSeller}
        />
      </TestWrapper>
    )

    expect(screen.getByText('Dealer Make:')).toBeInTheDocument()
    expect(screen.getByText('Auto-Detected Configuration')).toBeInTheDocument()
  })
})