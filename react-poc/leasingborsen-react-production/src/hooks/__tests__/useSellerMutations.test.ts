import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { 
  useCreateSeller, 
  useUpdateSeller, 
  useDeleteSeller,
  type CreateSellerData,
  type UpdateSellerData 
} from '../useSellerMutations'

// Mock supabase
const mockSupabase = {
  from: vi.fn(() => mockSupabase),
  insert: vi.fn(() => mockSupabase),
  update: vi.fn(() => mockSupabase),
  delete: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  single: vi.fn(() => mockSupabase),
  limit: vi.fn(() => mockSupabase)
}

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase
}))

// Mock toast
const mockToast = {
  success: vi.fn(),
  error: vi.fn()
}

vi.mock('sonner', () => ({
  toast: mockToast
}))

// Test wrapper for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )

  return { Wrapper, queryClient }
}

describe('useSellerMutations with make_id support', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useCreateSeller', () => {
    const mockCreatedSeller = {
      id: 'seller-1',
      name: 'Toyota Dealer',
      email: 'contact@toyota-dealer.dk',
      phone: '+45 12 34 56 78',
      company: 'Toyota Dealer ApS',
      address: 'Bilgade 123, 2000 Frederiksberg',
      country: 'Denmark',
      logo_url: 'https://example.com/toyota-logo.png',
      make_id: 'make-1',
      created_at: '2024-06-27T12:00:00Z',
      updated_at: '2024-06-27T12:00:00Z'
    }

    it('creates seller with make_id', async () => {
      mockSupabase.from.mockReturnValue({
        ...mockSupabase,
        insert: vi.fn(() => ({
          ...mockSupabase,
          select: vi.fn(() => ({
            ...mockSupabase,
            single: vi.fn(() => Promise.resolve({
              data: mockCreatedSeller,
              error: null
            }))
          }))
        }))
      })

      const { Wrapper } = createWrapper()
      const { result } = renderHook(() => useCreateSeller(), { wrapper: Wrapper })

      const sellerData: CreateSellerData = {
        name: 'Toyota Dealer',
        email: 'contact@toyota-dealer.dk',
        phone: '+45 12 34 56 78',
        company: 'Toyota Dealer ApS',
        address: 'Bilgade 123, 2000 Frederiksberg',
        country: 'Denmark',
        logo_url: 'https://example.com/toyota-logo.png',
        make_id: 'make-1'
      }

      result.current.mutate(sellerData)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Verify the mutation was called with correct data including make_id
      expect(mockSupabase.from).toHaveBeenCalledWith('sellers')
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        name: 'Toyota Dealer',
        email: 'contact@toyota-dealer.dk',
        phone: '+45 12 34 56 78',
        company: 'Toyota Dealer ApS',
        address: 'Bilgade 123, 2000 Frederiksberg',
        country: 'Denmark',
        logo_url: 'https://example.com/toyota-logo.png',
        make_id: 'make-1'
      })

      expect(result.current.data).toEqual(mockCreatedSeller)
      expect(mockToast.success).toHaveBeenCalledWith('Sælger blev oprettet succesfuldt')
    })

    it('creates seller without make_id (multi-brand dealer)', async () => {
      const mockCreatedSellerNoMake = {
        ...mockCreatedSeller,
        make_id: null,
        id: 'seller-2',
        name: 'Multi-Brand Dealer'
      }

      mockSupabase.from.mockReturnValue({
        ...mockSupabase,
        insert: vi.fn(() => ({
          ...mockSupabase,
          select: vi.fn(() => ({
            ...mockSupabase,
            single: vi.fn(() => Promise.resolve({
              data: mockCreatedSellerNoMake,
              error: null
            }))
          }))
        }))
      })

      const { Wrapper } = createWrapper()
      const { result } = renderHook(() => useCreateSeller(), { wrapper: Wrapper })

      const sellerData: CreateSellerData = {
        name: 'Multi-Brand Dealer',
        email: 'info@multibrand.dk',
        // make_id intentionally omitted
      }

      result.current.mutate(sellerData)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockSupabase.insert).toHaveBeenCalledWith({
        name: 'Multi-Brand Dealer',
        email: 'info@multibrand.dk'
        // make_id should not be included when undefined
      })

      expect(result.current.data).toEqual(mockCreatedSellerNoMake)
    })

    it('handles creation errors gracefully', async () => {
      const mockError = new Error('Unique constraint violation')
      
      mockSupabase.from.mockReturnValue({
        ...mockSupabase,
        insert: vi.fn(() => ({
          ...mockSupabase,
          select: vi.fn(() => ({
            ...mockSupabase,
            single: vi.fn(() => Promise.resolve({
              data: null,
              error: mockError
            }))
          }))
        }))
      })

      const { Wrapper } = createWrapper()
      const { result } = renderHook(() => useCreateSeller(), { wrapper: Wrapper })

      const sellerData: CreateSellerData = {
        name: 'Test Dealer',
        make_id: 'make-1'
      }

      result.current.mutate(sellerData)

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error?.message).toBe('Der opstod en fejl ved oprettelse af sælger')
      expect(mockToast.error).toHaveBeenCalledWith('Der opstod en fejl ved oprettelse af sælger')
    })

    it('invalidates seller queries after successful creation', async () => {
      mockSupabase.from.mockReturnValue({
        ...mockSupabase,
        insert: vi.fn(() => ({
          ...mockSupabase,
          select: vi.fn(() => ({
            ...mockSupabase,
            single: vi.fn(() => Promise.resolve({
              data: mockCreatedSeller,
              error: null
            }))
          }))
        }))
      })

      const { Wrapper, queryClient } = createWrapper()
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
      
      const { result } = renderHook(() => useCreateSeller(), { wrapper: Wrapper })

      result.current.mutate({
        name: 'Toyota Dealer',
        make_id: 'make-1'
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['sellers'] })
    })
  })

  describe('useUpdateSeller', () => {
    const mockUpdatedSeller = {
      id: 'seller-1',
      name: 'Updated Toyota Dealer',
      email: 'new-contact@toyota-dealer.dk',
      phone: '+45 87 65 43 21',
      company: 'Updated Toyota Dealer ApS',
      address: 'New Address 456, 2100 København Ø',
      country: 'Denmark',
      logo_url: 'https://example.com/new-toyota-logo.png',
      make_id: 'make-2', // Changed from Toyota to BMW
      created_at: '2024-06-27T12:00:00Z',
      updated_at: '2024-06-27T14:30:00Z'
    }

    it('updates seller with new make_id', async () => {
      mockSupabase.from.mockReturnValue({
        ...mockSupabase,
        update: vi.fn(() => ({
          ...mockSupabase,
          eq: vi.fn(() => ({
            ...mockSupabase,
            select: vi.fn(() => ({
              ...mockSupabase,
              single: vi.fn(() => Promise.resolve({
                data: mockUpdatedSeller,
                error: null
              }))
            }))
          }))
        }))
      })

      const { Wrapper } = createWrapper()
      const { result } = renderHook(() => useUpdateSeller(), { wrapper: Wrapper })

      const updateData: UpdateSellerData = {
        id: 'seller-1',
        name: 'Updated Toyota Dealer',
        make_id: 'make-2' // Changing make from Toyota to BMW
      }

      result.current.mutate(updateData)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockSupabase.from).toHaveBeenCalledWith('sellers')
      expect(mockSupabase.update).toHaveBeenCalledWith({
        name: 'Updated Toyota Dealer',
        make_id: 'make-2'
      })
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'seller-1')

      expect(result.current.data).toEqual(mockUpdatedSeller)
      expect(mockToast.success).toHaveBeenCalledWith('Sælger blev opdateret succesfuldt')
    })

    it('updates seller to remove make_id (convert to multi-brand)', async () => {
      const mockUpdatedSellerNoMake = {
        ...mockUpdatedSeller,
        make_id: null,
        name: 'Now Multi-Brand Dealer'
      }

      mockSupabase.from.mockReturnValue({
        ...mockSupabase,
        update: vi.fn(() => ({
          ...mockSupabase,
          eq: vi.fn(() => ({
            ...mockSupabase,
            select: vi.fn(() => ({
              ...mockSupabase,
              single: vi.fn(() => Promise.resolve({
                data: mockUpdatedSellerNoMake,
                error: null
              }))
            }))
          }))
        }))
      })

      const { Wrapper } = createWrapper()
      const { result } = renderHook(() => useUpdateSeller(), { wrapper: Wrapper })

      const updateData: UpdateSellerData = {
        id: 'seller-1',
        name: 'Now Multi-Brand Dealer',
        make_id: undefined // Removing make specialization
      }

      result.current.mutate(updateData)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockSupabase.update).toHaveBeenCalledWith({
        name: 'Now Multi-Brand Dealer',
        make_id: undefined
      })

      expect(result.current.data).toEqual(mockUpdatedSellerNoMake)
    })

    it('handles update errors gracefully', async () => {
      const mockError = new Error('Foreign key constraint violation')
      
      mockSupabase.from.mockReturnValue({
        ...mockSupabase,
        update: vi.fn(() => ({
          ...mockSupabase,
          eq: vi.fn(() => ({
            ...mockSupabase,
            select: vi.fn(() => ({
              ...mockSupabase,
              single: vi.fn(() => Promise.resolve({
                data: null,
                error: mockError
              }))
            }))
          }))
        }))
      })

      const { Wrapper } = createWrapper()
      const { result } = renderHook(() => useUpdateSeller(), { wrapper: Wrapper })

      const updateData: UpdateSellerData = {
        id: 'seller-1',
        make_id: 'invalid-make-id'
      }

      result.current.mutate(updateData)

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error?.message).toBe('Der opstod en fejl ved opdatering af sælger')
      expect(mockToast.error).toHaveBeenCalledWith('Der opstod en fejl ved opdatering af sælger')
    })

    it('invalidates both sellers and individual seller queries after update', async () => {
      mockSupabase.from.mockReturnValue({
        ...mockSupabase,
        update: vi.fn(() => ({
          ...mockSupabase,
          eq: vi.fn(() => ({
            ...mockSupabase,
            select: vi.fn(() => ({
              ...mockSupabase,
              single: vi.fn(() => Promise.resolve({
                data: mockUpdatedSeller,
                error: null
              }))
            }))
          }))
        }))
      })

      const { Wrapper, queryClient } = createWrapper()
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
      
      const { result } = renderHook(() => useUpdateSeller(), { wrapper: Wrapper })

      result.current.mutate({
        id: 'seller-1',
        make_id: 'make-2'
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['sellers'] })
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['seller', 'seller-1'] })
    })
  })

  describe('useDeleteSeller - make relationship considerations', () => {
    it('successfully deletes seller with make assignment', async () => {
      // Mock no listings check
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'listings') {
          return {
            ...mockSupabase,
            select: vi.fn(() => ({
              ...mockSupabase,
              eq: vi.fn(() => ({
                ...mockSupabase,
                limit: vi.fn(() => Promise.resolve({
                  data: [], // No listings
                  error: null
                }))
              }))
            }))
          }
        } else if (table === 'sellers') {
          return {
            ...mockSupabase,
            delete: vi.fn(() => ({
              ...mockSupabase,
              eq: vi.fn(() => Promise.resolve({
                data: null,
                error: null
              }))
            }))
          }
        }
        return mockSupabase
      })

      const { Wrapper } = createWrapper()
      const { result } = renderHook(() => useDeleteSeller(), { wrapper: Wrapper })

      result.current.mutate('seller-1')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockSupabase.from).toHaveBeenCalledWith('listings')
      expect(mockSupabase.from).toHaveBeenCalledWith('sellers')
      expect(mockToast.success).toHaveBeenCalledWith('Sælger blev slettet succesfuldt')
    })

    it('prevents deletion of seller with existing listings regardless of make', async () => {
      // Mock existing listings
      mockSupabase.from.mockReturnValue({
        ...mockSupabase,
        select: vi.fn(() => ({
          ...mockSupabase,
          eq: vi.fn(() => ({
            ...mockSupabase,
            limit: vi.fn(() => Promise.resolve({
              data: [{ id: 'listing-1' }], // Has listings
              error: null
            }))
          }))
        }))
      })

      const { Wrapper } = createWrapper()
      const { result } = renderHook(() => useDeleteSeller(), { wrapper: Wrapper })

      result.current.mutate('seller-1')

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error?.message).toBe('Kan ikke slette sælger med eksisterende annoncer')
      expect(mockToast.error).toHaveBeenCalledWith('Kan ikke slette sælger med eksisterende annoncer')
    })
  })

  describe('Integration with make system', () => {
    it('supports full CRUD cycle with make assignments', async () => {
      // 1. Create seller with make
      const createMockData = {
        id: 'seller-new',
        name: 'New BMW Dealer',
        make_id: 'make-2',
        created_at: '2024-06-27T12:00:00Z'
      }

      // 2. Update seller to different make
      const updateMockData = {
        ...createMockData,
        make_id: 'make-1', // Change to Toyota
        updated_at: '2024-06-27T14:00:00Z'
      }

      // Mock create operation
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'sellers') {
          return {
            ...mockSupabase,
            insert: vi.fn(() => ({
              ...mockSupabase,
              select: vi.fn(() => ({
                ...mockSupabase,
                single: vi.fn(() => Promise.resolve({
                  data: createMockData,
                  error: null
                }))
              }))
            })),
            update: vi.fn(() => ({
              ...mockSupabase,
              eq: vi.fn(() => ({
                ...mockSupabase,
                select: vi.fn(() => ({
                  ...mockSupabase,
                  single: vi.fn(() => Promise.resolve({
                    data: updateMockData,
                    error: null
                  }))
                }))
              }))
            }))
          }
        }
        return mockSupabase
      })

      const { Wrapper } = createWrapper()
      
      // Test create
      const { result: createResult } = renderHook(() => useCreateSeller(), { wrapper: Wrapper })
      
      createResult.current.mutate({
        name: 'New BMW Dealer',
        make_id: 'make-2'
      })

      await waitFor(() => {
        expect(createResult.current.isSuccess).toBe(true)
      })

      expect(createResult.current.data?.make_id).toBe('make-2')

      // Test update
      const { result: updateResult } = renderHook(() => useUpdateSeller(), { wrapper: Wrapper })
      
      updateResult.current.mutate({
        id: 'seller-new',
        make_id: 'make-1' // Change from BMW to Toyota
      })

      await waitFor(() => {
        expect(updateResult.current.isSuccess).toBe(true)
      })

      expect(updateResult.current.data?.make_id).toBe('make-1')
    })
  })
})