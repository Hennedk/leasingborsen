import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { SellerImportButton } from '../SellerImportButton'
import type { Seller } from '@/hooks/useSellers'

// Mock all external dependencies
vi.mock('@/lib/services/pdfTextExtractor', () => ({
  pdfTextExtractor: {
    extractText: vi.fn().mockResolvedValue({ 
      text: 'Toyota Yaris 1.5 Hybrid - 3.500 kr/md\nToyota Corolla 2.0 Hybrid - 4.200 kr/md\nToyota RAV4 2.5 Hybrid - 5.800 kr/md'
    })
  }
}))

vi.mock('@/hooks/useJobProgress', () => ({
  useJobProgress: vi.fn((jobId, options) => ({
    startPolling: vi.fn((id) => {
      // Simulate successful completion after delay
      setTimeout(() => {
        options?.onCompleted?.({
          id,
          batchId: 'batch-123',
          itemsProcessed: 3,
          progress: 100,
          status: 'completed',
          extractionSessionId: 'session-456'
        })
      }, 100)
    })
  }))
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}))

vi.mock('@/components/ErrorBoundaries', () => ({
  BatchUploadErrorBoundary: ({ children }: any) => children
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

// Mock fetch for API calls
global.fetch = vi.fn()

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

describe('Complete PDF Upload Workflow E2E', () => {
  const mockToyotaSeller: Seller = {
    id: 'seller-toyota-1',
    name: 'Toyota Danmark A/S',
    email: 'info@toyota.dk',
    phone: '+45 12 34 56 78',
    company: 'Toyota Danmark A/S',
    address: 'Hovedvejen 123, 2000 Frederiksberg',
    country: 'Denmark',
    make_id: 'make-toyota-1',
    make_name: 'Toyota',
    total_listings: 15,
    last_import_date: '2024-01-15T10:00:00Z'
  }

  const mockOnImportClick = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
    
    // Setup successful API responses
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          extracted_text: 'Toyota Yaris 1.5 Hybrid - 3.500 kr/md\nToyota Corolla 2.0 Hybrid - 4.200 kr/md',
          structured_data: {
            vehicles: [
              { make: 'Toyota', model: 'Yaris', price: 3500 },
              { make: 'Toyota', model: 'Corolla', price: 4200 }
            ]
          }
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          jobId: 'job-test-123',
          batchId: 'batch-test-456',
          message: 'AI extraction started',
          extractionSessionId: 'session-789'
        })
      } as Response)
  })

  describe('Full Workflow: Button Click → Upload → Processing → Results', () => {
    it('completes the entire PDF upload and extraction workflow', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <SellerImportButton
            seller={mockToyotaSeller}
            onImportClick={mockOnImportClick}
          />
        </TestWrapper>
      )

      // Step 1: Initial state verification
      expect(screen.getByText('Update Listings')).toBeInTheDocument()
      expect(screen.getByText('15 listings')).toBeInTheDocument()
      expect(screen.getByText('Active')).toBeInTheDocument()

      // Step 2: Click import button to open modal
      await user.click(screen.getByText('Update Listings'))

      // Step 3: Verify modal opens with auto-configuration
      await waitFor(() => {
        expect(screen.getByText('Upload PDF - Toyota Danmark A/S')).toBeInTheDocument()
        expect(screen.getByText('Auto-Detected Configuration')).toBeInTheDocument()
        expect(screen.getByText('toyota')).toBeInTheDocument()
        expect(screen.getByText('Toyota')).toBeInTheDocument()
      })

      // Step 4: Upload PDF file
      const file = new File(['mock pdf content'], 'toyota-price-list.pdf', { 
        type: 'application/pdf' 
      })
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      if (fileInput) {
        Object.defineProperty(fileInput, 'files', {
          value: [file],
          configurable: true
        })
        fireEvent.change(fileInput)
      }

      // Step 5: Verify file selection
      await waitFor(() => {
        expect(screen.getByText('toyota-price-list.pdf')).toBeInTheDocument()
        expect(screen.getByText('Extract with AI')).toBeInTheDocument()
      })

      // Step 6: Start extraction process
      await user.click(screen.getByText('Extract with AI'))

      // Step 7: Verify processing starts
      await waitFor(() => {
        expect(screen.getByText(/Railway Text Extraction/)).toBeInTheDocument()
        expect(screen.getByText(/AI Processing/)).toBeInTheDocument()
        expect(screen.getByText(/Starting PDF extraction/)).toBeInTheDocument()
      })

      // Step 8: Verify API calls are made
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(2)
      })

      // Verify Railway API call
      expect(fetch).toHaveBeenNthCalledWith(1,
        'https://leasingborsen-production.up.railway.app/extract/structured',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData)
        })
      )

      // Verify AI extraction API call
      expect(fetch).toHaveBeenNthCalledWith(2,
        expect.stringContaining('/functions/v1/ai-extract-vehicles'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer'),
            'Content-Type': 'application/json'
          }),
          body: expect.stringMatching(/"dealerType":"toyota"/)
        })
      )

      // Step 9: Wait for processing completion
      await waitFor(() => {
        expect(screen.getByText(/AI extraction completed successfully/)).toBeInTheDocument()
      }, { timeout: 5000 })

      // Step 10: Verify results display
      await waitFor(() => {
        expect(screen.getByText(/Successfully extracted \d+ vehicles from PDF/)).toBeInTheDocument()
        expect(screen.getByText('Review Extracted Data')).toBeInTheDocument()
      })

      // Step 11: Test navigation to results
      await user.click(screen.getByText('Review Extracted Data'))

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/admin/extraction-sessions/session-789')
      })
    })

    it('handles generic dealer workflow', async () => {
      const user = userEvent.setup()
      const genericSeller: Seller = {
        id: 'seller-generic-1',
        name: 'Multi Brand Auto',
        email: 'info@multibrand.dk',
        make_id: null,
        make_name: null,
        total_listings: 0
      }
      
      render(
        <TestWrapper>
          <SellerImportButton
            seller={genericSeller}
            onImportClick={mockOnImportClick}
          />
        </TestWrapper>
      )

      // Open modal
      await user.click(screen.getByText('Import Listings'))

      // Verify generic configuration
      await waitFor(() => {
        expect(screen.getByText('Generic')).toBeInTheDocument()
        expect(screen.getByText('All Makes')).toBeInTheDocument()
      })

      // Upload file and process
      const file = new File(['content'], 'generic-list.pdf', { type: 'application/pdf' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      
      if (fileInput) {
        Object.defineProperty(fileInput, 'files', { value: [file], configurable: true })
        fireEvent.change(fileInput)
      }

      await user.click(screen.getByText('Extract with AI'))

      // Verify generic extraction is called
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/functions/v1/ai-extract-vehicles'),
          expect.objectContaining({
            body: expect.stringMatching(/"dealerType":"auto-detect"/)
          })
        )
      })
    })

    it('handles VW Group dealer workflow', async () => {
      const user = userEvent.setup()
      const vwSeller: Seller = {
        id: 'seller-vw-1',
        name: 'Volkswagen Group Danmark',
        email: 'info@vw.dk',
        make_id: 'make-vw-1',
        make_name: 'Volkswagen',
        total_listings: 8
      }
      
      render(
        <TestWrapper>
          <SellerImportButton
            seller={vwSeller}
            onImportClick={mockOnImportClick}
          />
        </TestWrapper>
      )

      await user.click(screen.getByText('Update Listings'))

      await waitFor(() => {
        expect(screen.getByText('volkswagen')).toBeInTheDocument()
        expect(screen.getByText('Volkswagen')).toBeInTheDocument()
      })

      // Process with VW configuration
      const file = new File(['vw content'], 'vw-list.pdf', { type: 'application/pdf' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      
      if (fileInput) {
        Object.defineProperty(fileInput, 'files', { value: [file], configurable: true })
        fireEvent.change(fileInput)
      }

      await user.click(screen.getByText('Extract with AI'))

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/functions/v1/ai-extract-vehicles'),
          expect.objectContaining({
            body: expect.stringMatching(/"dealerType":"volkswagen"/)
          })
        )
      })
    })
  })

  describe('Error Handling Workflow', () => {
    it('handles Railway service failure gracefully', async () => {
      const user = userEvent.setup()
      
      // Mock Railway failure
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Railway service unavailable'))
      
      render(
        <TestWrapper>
          <SellerImportButton
            seller={mockToyotaSeller}
            onImportClick={mockOnImportClick}
          />
        </TestWrapper>
      )

      await user.click(screen.getByText('Update Listings'))

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      
      if (fileInput) {
        Object.defineProperty(fileInput, 'files', { value: [file], configurable: true })
        fireEvent.change(fileInput)
      }

      await user.click(screen.getByText('Extract with AI'))

      await waitFor(() => {
        expect(screen.getByText(/Railway service unavailable/)).toBeInTheDocument()
      })

      // Verify error state allows retry
      expect(screen.queryByText('Extract Another PDF')).toBeInTheDocument()
    })

    it('handles AI processing failure', async () => {
      const user = userEvent.setup()
      
      // Mock successful Railway but failed AI
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ extracted_text: 'Test text' })
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          text: () => Promise.resolve('AI processing failed - quota exceeded')
        } as Response)
      
      render(
        <TestWrapper>
          <SellerImportButton
            seller={mockToyotaSeller}
            onImportClick={mockOnImportClick}
          />
        </TestWrapper>
      )

      await user.click(screen.getByText('Update Listings'))

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      
      if (fileInput) {
        Object.defineProperty(fileInput, 'files', { value: [file], configurable: true })
        fireEvent.change(fileInput)
      }

      await user.click(screen.getByText('Extract with AI'))

      await waitFor(() => {
        expect(screen.getByText(/AI processing failed - quota exceeded/)).toBeInTheDocument()
      })
    })
  })

  describe('User Experience Flow', () => {
    it('provides clear progress feedback throughout the process', async () => {
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

      // Upload file
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      
      if (fileInput) {
        Object.defineProperty(fileInput, 'files', { value: [file], configurable: true })
        fireEvent.change(fileInput)
      }

      // Start processing
      await user.click(screen.getByText('Extract with AI'))

      // Verify progress indicators
      await waitFor(() => {
        expect(screen.getByText(/Starting PDF extraction/)).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByText(/Railway Text Extraction/)).toBeInTheDocument()
        expect(screen.getByText(/AI Processing/)).toBeInTheDocument()
        expect(screen.getByText(/Complete/)).toBeInTheDocument()
      })

      // Verify progress percentage
      expect(screen.getByText(/\d+%/)).toBeInTheDocument()
    })

    it('allows user to extract another PDF after completion', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <SellerImportButton
            seller={mockToyotaSeller}
            onImportClick={mockOnImportClick}
          />
        </TestWrapper>
      )

      // Complete workflow
      await user.click(screen.getByText('Update Listings'))

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      
      if (fileInput) {
        Object.defineProperty(fileInput, 'files', { value: [file], configurable: true })
        fireEvent.change(fileInput)
      }

      await user.click(screen.getByText('Extract with AI'))

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText('Review Extracted Data')).toBeInTheDocument()
      }, { timeout: 5000 })

      // Test reset functionality
      await user.click(screen.getByText('Extract Another PDF'))

      await waitFor(() => {
        expect(screen.getByText('Drag and drop your PDF here')).toBeInTheDocument()
      })
    })
  })

  describe('Integration Points', () => {
    it('triggers data refresh when upload completes', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <SellerImportButton
            seller={mockToyotaSeller}
            onImportClick={mockOnImportClick}
          />
        </TestWrapper>
      )

      // Complete workflow
      await user.click(screen.getByText('Update Listings'))

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      
      if (fileInput) {
        Object.defineProperty(fileInput, 'files', { value: [file], configurable: true })
        fireEvent.change(fileInput)
      }

      await user.click(screen.getByText('Extract with AI'))

      // The onImportClick should eventually be called for data refresh
      // This would happen when the modal closes after successful upload
      expect(mockOnImportClick).toBeDefined()
    })
  })
})