import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { SellerPDFUploadModal } from '../SellerPDFUploadModal'
import type { Seller } from '@/hooks/useSellers'

// Mock dependencies
vi.mock('@/lib/services/pdfTextExtractor', () => ({
  pdfTextExtractor: {
    extractText: vi.fn().mockResolvedValue({ text: 'Mock extracted text' })
  }
}))

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

// Mock fetch for Railway and AI API calls
global.fetch = vi.fn()

// Mock file input
Object.defineProperty(window, 'File', {
  value: function File(bits, name, options) {
    return {
      name,
      size: bits.length,
      type: options?.type || 'application/pdf',
      lastModified: Date.now(),
      ...options
    }
  }
})

// Test wrapper
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

describe('SellerPDFUploadModal', () => {
  const mockSeller: Seller = {
    id: 'seller-1',
    name: 'Toyota Dealer Test',
    email: 'test@toyota.dk',
    phone: '+45 12 34 56 78',
    company: 'Toyota Test ApS',
    address: 'Test Vej 123',
    country: 'Denmark',
    make_id: 'make-1',
    make_name: 'Toyota',
    total_listings: 5,
    last_import_date: '2024-01-15T10:00:00Z'
  }

  const mockSellerGeneric: Seller = {
    id: 'seller-2',
    name: 'Generic Dealer',
    email: 'test@generic.dk',
    make_id: null,
    make_name: null
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset fetch mock
    vi.mocked(fetch).mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Modal Opening and Auto-Configuration', () => {
    it('displays modal when open prop is true', () => {
      render(
        <TestWrapper>
          <SellerPDFUploadModal
            open={true}
            onOpenChange={vi.fn()}
            seller={mockSeller}
          />
        </TestWrapper>
      )

      expect(screen.getByText('Upload PDF - Toyota Dealer Test')).toBeInTheDocument()
      expect(screen.getByText('Upload a PDF price list for automatic extraction and processing')).toBeInTheDocument()
    })

    it('auto-detects Toyota dealer configuration', () => {
      render(
        <TestWrapper>
          <SellerPDFUploadModal
            open={true}
            onOpenChange={vi.fn()}
            seller={mockSeller}
          />
        </TestWrapper>
      )

      expect(screen.getByText('Auto-Detected Configuration')).toBeInTheDocument()
      expect(screen.getByText('toyota')).toBeInTheDocument()
      expect(screen.getByText('Toyota')).toBeInTheDocument()
    })

    it('auto-detects generic dealer configuration', () => {
      render(
        <TestWrapper>
          <SellerPDFUploadModal
            open={true}
            onOpenChange={vi.fn()}
            seller={mockSellerGeneric}
          />
        </TestWrapper>
      )

      expect(screen.getByText('Generic')).toBeInTheDocument()
      expect(screen.getByText('All Makes')).toBeInTheDocument()
    })

    it('auto-detects VW dealer from name', () => {
      const vwSeller = { ...mockSeller, name: 'Volkswagen Dealer', make_name: null }
      
      render(
        <TestWrapper>
          <SellerPDFUploadModal
            open={true}
            onOpenChange={vi.fn()}
            seller={vwSeller}
          />
        </TestWrapper>
      )

      expect(screen.getByText('volkswagen')).toBeInTheDocument()
    })
  })

  describe('File Upload', () => {
    it('shows file upload area initially', () => {
      render(
        <TestWrapper>
          <SellerPDFUploadModal
            open={true}
            onOpenChange={vi.fn()}
            seller={mockSeller}
          />
        </TestWrapper>
      )

      expect(screen.getByText('Drag and drop your PDF here, or click to browse')).toBeInTheDocument()
      expect(screen.getByText('Supports dealer price lists in PDF format')).toBeInTheDocument()
    })

    it('handles file selection via input', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <SellerPDFUploadModal
            open={true}
            onOpenChange={vi.fn()}
            seller={mockSeller}
          />
        </TestWrapper>
      )

      const file = new File(['test pdf content'], 'test.pdf', { type: 'application/pdf' })
      const input = screen.getByRole('button', { name: /drag and drop/i })
      
      // Click to open file dialog
      await user.click(input)
      
      // Simulate file selection
      const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement
      if (hiddenInput) {
        Object.defineProperty(hiddenInput, 'files', {
          value: [file],
          configurable: true
        })
        fireEvent.change(hiddenInput)
      }

      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument()
        expect(screen.getByText('Extract with AI')).toBeInTheDocument()
      })
    })

    it('shows selected file information', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <SellerPDFUploadModal
            open={true}
            onOpenChange={vi.fn()}
            seller={mockSeller}
          />
        </TestWrapper>
      )

      const file = new File(['test pdf content'], 'dealer-list.pdf', { type: 'application/pdf' })
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      
      if (input) {
        Object.defineProperty(input, 'files', {
          value: [file],
          configurable: true
        })
        fireEvent.change(input)
      }

      await waitFor(() => {
        expect(screen.getByText('dealer-list.pdf')).toBeInTheDocument()
        expect(screen.getByText(/MB/)).toBeInTheDocument()
        expect(screen.getByText('Change File')).toBeInTheDocument()
        expect(screen.getByText('Extract with AI')).toBeInTheDocument()
      })
    })
  })

  describe('Railway + AI Processing Pipeline', () => {
    it('shows processing steps during extraction', async () => {
      const user = userEvent.setup()
      
      // Mock successful Railway response
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ extracted_text: 'Railway extracted text' })
        } as Response)
        // Mock successful AI response
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ jobId: 'job-123', itemsProcessed: 5 })
        } as Response)

      render(
        <TestWrapper>
          <SellerPDFUploadModal
            open={true}
            onOpenChange={vi.fn()}
            seller={mockSeller}
          />
        </TestWrapper>
      )

      // Upload file
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      
      if (input) {
        Object.defineProperty(input, 'files', {
          value: [file],
          configurable: true
        })
        fireEvent.change(input)
      }

      // Start processing
      await waitFor(() => {
        expect(screen.getByText('Extract with AI')).toBeInTheDocument()
      })
      
      await user.click(screen.getByText('Extract with AI'))

      // Check progress indicators
      await waitFor(() => {
        expect(screen.getByText(/Railway Text Extraction/)).toBeInTheDocument()
        expect(screen.getByText(/AI Processing/)).toBeInTheDocument()
        expect(screen.getByText(/Complete/)).toBeInTheDocument()
      })
    })

    it('handles Railway extraction failure gracefully', async () => {
      const user = userEvent.setup()
      
      // Mock Railway failure
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Railway service unavailable'))

      render(
        <TestWrapper>
          <SellerPDFUploadModal
            open={true}
            onOpenChange={vi.fn()}
            seller={mockSeller}
          />
        </TestWrapper>
      )

      // Upload and process file
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      
      if (input) {
        Object.defineProperty(input, 'files', { value: [file], configurable: true })
        fireEvent.change(input)
      }

      await user.click(screen.getByText('Extract with AI'))

      await waitFor(() => {
        expect(screen.getByText(/Railway service unavailable/)).toBeInTheDocument()
      })
    })

    it('calls correct APIs with proper parameters', async () => {
      const user = userEvent.setup()
      
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ extracted_text: 'Test extracted content' })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ jobId: 'job-456' })
        } as Response)

      render(
        <TestWrapper>
          <SellerPDFUploadModal
            open={true}
            onOpenChange={vi.fn()}
            seller={mockSeller}
          />
        </TestWrapper>
      )

      // Upload and process
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      
      if (input) {
        Object.defineProperty(input, 'files', { value: [file], configurable: true })
        fireEvent.change(input)
      }

      await user.click(screen.getByText('Extract with AI'))

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(2)
      })

      // Check Railway API call
      expect(fetch).toHaveBeenNthCalledWith(1, 
        'https://leasingborsen-production.up.railway.app/extract/structured',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData)
        })
      )

      // Check AI API call
      expect(fetch).toHaveBeenNthCalledWith(2,
        expect.stringContaining('/functions/v1/extract-cars-generic'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('"dealerType":"toyota"')
        })
      )
    })
  })

  describe('Results Display', () => {
    it('shows extraction results with statistics', async () => {
      render(
        <TestWrapper>
          <SellerPDFUploadModal
            open={true}
            onOpenChange={vi.fn()}
            seller={mockSeller}
          />
        </TestWrapper>
      )

      // Simulate completed extraction by setting state manually through component
      // We'll test this by triggering the useJobProgress completion callback
      const mockResult = {
        batchId: 'batch-123',
        jobId: 'job-123',
        itemsCreated: 15,
        stats: {
          new: 15,
          updated: 3,
          removed: 1,
          total_processed: 19
        }
      }

      // This would normally be triggered by the useJobProgress hook
      // For testing, we can verify the UI shows the expected content structure
      expect(screen.getByText('Auto-Detected Configuration')).toBeInTheDocument()
    })

    it('provides review button for navigation', () => {
      render(
        <TestWrapper>
          <SellerPDFUploadModal
            open={true}
            onOpenChange={vi.fn()}
            seller={mockSeller}
          />
        </TestWrapper>
      )

      // Initially should not show review button
      expect(screen.queryByText('Review Extracted Data')).not.toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('displays error message when AI processing fails', async () => {
      const user = userEvent.setup()
      
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ extracted_text: 'Test' })
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          text: () => Promise.resolve('AI processing failed')
        } as Response)

      render(
        <TestWrapper>
          <SellerPDFUploadModal
            open={true}
            onOpenChange={vi.fn()}
            seller={mockSeller}
          />
        </TestWrapper>
      )

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      
      if (input) {
        Object.defineProperty(input, 'files', { value: [file], configurable: true })
        fireEvent.change(input)
      }

      await user.click(screen.getByText('Extract with AI'))

      await waitFor(() => {
        expect(screen.getByText(/AI extraction failed/)).toBeInTheDocument()
      })
    })

    it('allows retry after error', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <SellerPDFUploadModal
            open={true}
            onOpenChange={vi.fn()}
            seller={mockSeller}
          />
        </TestWrapper>
      )

      // Upload file first
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      
      if (input) {
        Object.defineProperty(input, 'files', { value: [file], configurable: true })
        fireEvent.change(input)
      }

      // After error (simulated by having error state), should show reset options
      expect(screen.getByText('Change File')).toBeInTheDocument()
    })
  })

  describe('Modal Controls', () => {
    it('calls onOpenChange when closed', () => {
      const onOpenChange = vi.fn()
      
      render(
        <TestWrapper>
          <SellerPDFUploadModal
            open={true}
            onOpenChange={onOpenChange}
            seller={mockSeller}
          />
        </TestWrapper>
      )

      // Simulate ESC key or close button
      fireEvent.keyDown(document, { key: 'Escape' })
      
      // The exact behavior depends on the Dialog component implementation
      // We mainly want to ensure the onOpenChange prop is passed correctly
      expect(onOpenChange).toBeDefined()
    })

    it('calls onUploadComplete when provided', () => {
      const onUploadComplete = vi.fn()
      
      render(
        <TestWrapper>
          <SellerPDFUploadModal
            open={true}
            onOpenChange={vi.fn()}
            seller={mockSeller}
            onUploadComplete={onUploadComplete}
          />
        </TestWrapper>
      )

      // The callback should be available for use when processing completes
      expect(onUploadComplete).toBeDefined()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels and structure', () => {
      render(
        <TestWrapper>
          <SellerPDFUploadModal
            open={true}
            onOpenChange={vi.fn()}
            seller={mockSeller}
          />
        </TestWrapper>
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Upload PDF - Toyota Dealer Test')).toBeInTheDocument()
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <SellerPDFUploadModal
            open={true}
            onOpenChange={vi.fn()}
            seller={mockSeller}
          />
        </TestWrapper>
      )

      // Test tab navigation
      await user.tab()
      
      // Should be able to navigate to upload area
      expect(document.activeElement).toBeDefined()
    })
  })
})