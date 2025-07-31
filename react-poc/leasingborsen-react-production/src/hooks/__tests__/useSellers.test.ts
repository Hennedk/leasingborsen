import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useSellers, useSeller } from '../useSellers'
import type { Seller } from '../useSellers'

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    order: vi.fn(),
    single: vi.fn(),
    limit: vi.fn()
  }
}))

// Test wrapper for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }

  return { Wrapper, queryClient }
}

describe('useSellers hook with make data', () => {
  const mockSellersData = [
    {
      id: 'seller-1',
      name: 'Toyota Dealer',
      email: 'contact@toyota-dealer.dk',
      phone: '+45 12 34 56 78',
      company: 'Toyota Dealer ApS',
      address: 'Bilgade 123, 2000 Frederiksberg',
      country: 'Denmark',
      logo_url: 'https://example.com/toyota-logo.png',
      make_id: 'make-1',
      makes: { name: 'Toyota' },
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z'
    },
    {
      id: 'seller-2',
      name: 'Multi-Brand Dealer',
      email: 'info@multibrand.dk',
      phone: '+45 87 65 43 21',
      company: 'Multi-Brand ApS',
      address: 'Hovedgade 456, 1000 København',
      country: 'Denmark',
      logo_url: null,
      make_id: null,
      makes: null,
      created_at: '2024-01-20T14:30:00Z',
      updated_at: '2024-01-20T14:30:00Z'
    },
    {
      id: 'seller-3',
      name: 'BMW Specialist',
      email: 'bmw@specialist.dk',
      phone: '+45 11 22 33 44',
      company: 'BMW Specialist ApS',
      address: 'Sportsvej 789, 2100 København Ø',
      country: 'Denmark',
      logo_url: 'https://example.com/bmw-logo.png',
      make_id: 'make-2',
      makes: { name: 'BMW' },
      created_at: '2024-02-01T09:15:00Z',
      updated_at: '2024-02-01T09:15:00Z'
    }
  ]

  const mockListingsData = [
    { seller_id: 'seller-1' },
    { seller_id: 'seller-1' },
    { seller_id: 'seller-2' },
    { seller_id: 'seller-3' },
    { seller_id: 'seller-3' },
    { seller_id: 'seller-3' }
  ]

  const mockExtractionData = [
    { seller_id: 'seller-1', created_at: '2024-07-15T12:00:00Z' },
    { seller_id: 'seller-2', created_at: '2024-07-20T08:30:00Z' },
    { seller_id: 'seller-3', created_at: '2024-07-25T16:45:00Z' }
  ]

  let mockSupabase: any

  beforeEach(async () => {
    vi.clearAllMocks()
    const { supabase } = await import('@/lib/supabase')
    mockSupabase = vi.mocked(supabase)
  })

  describe('useSellers - with make data', () => {
    it('fetches sellers with make information from sellers table with join', async () => {
      const { supabase } = await import('@/lib/supabase')
      const mockSupabase = vi.mocked(supabase)
      
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'sellers') {
          return {
            ...mockSupabase,
            select: vi.fn(() => ({
              ...mockSupabase,
              order: vi.fn(() => Promise.resolve({
                data: mockSellersData,
                error: null
              }))
            }))
          }
        }
        if (table === 'listings') {
          return {
            ...mockSupabase,
            select: vi.fn(() => ({
              ...mockSupabase,
              in: vi.fn(() => Promise.resolve({
                data: mockListingsData,
                error: null
              }))
            }))
          }
        }
        if (table === 'extraction_sessions') {
          return {
            ...mockSupabase,
            select: vi.fn(() => ({
              ...mockSupabase,
              in: vi.fn(() => ({
                ...mockSupabase,
                order: vi.fn(() => Promise.resolve({
                  data: mockExtractionData,
                  error: null
                }))
              }))
            }))
          }
        }
        return mockSupabase
      })

      const { Wrapper } = createWrapper()
      const { result } = renderHook(() => useSellers(), { wrapper: Wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toHaveLength(3)
      
      // Verify Toyota dealer data
      const toyotaDealer = result.current.data?.find(s => s.id === 'seller-1')
      expect(toyotaDealer).toEqual({
        ...mockSellersData[0],
        make_name: 'Toyota',
        total_listings: 2,
        last_import_date: '2024-07-15T12:00:00Z',
        batch_config: null
      })

      // Verify multi-brand dealer (no make)
      const multiBrandDealer = result.current.data?.find(s => s.id === 'seller-2')
      expect(multiBrandDealer?.make_id).toBeNull()
      expect(multiBrandDealer?.make_name).toBeNull()
      expect(multiBrandDealer?.total_listings).toBe(1)

      // Verify BMW dealer data
      const bmwDealer = result.current.data?.find(s => s.id === 'seller-3')
      expect(bmwDealer?.make_id).toBe('make-2')
      expect(bmwDealer?.make_name).toBe('BMW')
      expect(bmwDealer?.total_listings).toBe(3)
    })

    it('uses sellers table with make join', async () => {
      mockSupabase.from.mockReturnValue({
        ...mockSupabase,
        select: vi.fn(() => ({
          ...mockSupabase,
          order: vi.fn(() => Promise.resolve({
            data: mockSellersData,
            error: null
          }))
        }))
      })

      const { Wrapper } = createWrapper()
      renderHook(() => useSellers(), { wrapper: Wrapper })

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('sellers')
      })
    })

    it('handles sellers with and without make assignments', async () => {
      const mixedSellersData = [
        {
          ...mockSellersData[0]
        },
        {
          ...mockSellersData[1]
        }
      ]

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'sellers') {
          return {
            ...mockSupabase,
            select: vi.fn(() => ({
              ...mockSupabase,
              order: vi.fn(() => Promise.resolve({
                data: mixedSellersData,
                error: null
              }))
            }))
          }
        }
        return {
          ...mockSupabase,
          select: vi.fn(() => ({
            ...mockSupabase,
            in: vi.fn(() => Promise.resolve({ data: [], error: null })),
            order: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }
      })

      const { Wrapper } = createWrapper()
      const { result } = renderHook(() => useSellers(), { wrapper: Wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      const sellers = result.current.data!
      expect(sellers).toHaveLength(2)

      // Verify seller with make
      const toyotaDealer = sellers.find(s => s.id === 'seller-1')
      expect(toyotaDealer?.make_id).toBe('make-1')
      expect(toyotaDealer?.make_name).toBe('Toyota')

      // Verify seller without make
      const multiBrandDealer = sellers.find(s => s.id === 'seller-2')
      expect(multiBrandDealer?.make_id).toBeNull()
      expect(multiBrandDealer?.make_name).toBeNull()
    })

    it('handles database errors gracefully', async () => {
      const mockError = new Error('Database connection failed')
      
      mockSupabase.from.mockReturnValue({
        ...mockSupabase,
        select: vi.fn(() => ({
          ...mockSupabase,
          order: vi.fn(() => Promise.resolve({
            data: null,
            error: mockError
          }))
        }))
      })

      const { Wrapper } = createWrapper()
      const { result } = renderHook(() => useSellers(), { wrapper: Wrapper })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error?.message).toBe('Der opstod en fejl ved hentning af sælgere')
    })
  })

  describe('useSeller - individual seller with make', () => {
    const singleSellerData = mockSellersData[0] // Toyota dealer

    it('fetches individual seller with make information', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'sellers') {
          return {
            ...mockSupabase,
            select: vi.fn(() => ({
              ...mockSupabase,
              eq: vi.fn(() => ({
                ...mockSupabase,
                single: vi.fn(() => Promise.resolve({
                  data: singleSellerData,
                  error: null
                }))
              }))
            }))
          }
        }
        if (table === 'listings') {
          return {
            ...mockSupabase,
            select: vi.fn(() => ({
              ...mockSupabase,
              eq: vi.fn(() => Promise.resolve({
                data: [{ seller_id: 'seller-1' }, { seller_id: 'seller-1' }],
                error: null
              }))
            }))
          }
        }
        if (table === 'extraction_sessions') {
          return {
            ...mockSupabase,
            select: vi.fn(() => ({
              ...mockSupabase,
              eq: vi.fn(() => ({
                ...mockSupabase,
                order: vi.fn(() => ({
                  ...mockSupabase,
                  limit: vi.fn(() => Promise.resolve({
                    data: [{ created_at: '2024-07-15T12:00:00Z' }],
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
      const { result } = renderHook(() => useSeller('seller-1'), { wrapper: Wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual({
        ...singleSellerData,
        make_name: 'Toyota',
        total_listings: 2,
        last_import_date: '2024-07-15T12:00:00Z',
        batch_config: null
      })

      // Verify make data is included
      expect(result.current.data?.make_id).toBe('make-1')
      expect(result.current.data?.make_name).toBe('Toyota')
    })

    it('uses sellers table with make join for individual seller lookup', async () => {
      mockSupabase.from.mockReturnValue({
        ...mockSupabase,
        select: vi.fn(() => ({
          ...mockSupabase,
          eq: vi.fn(() => ({
            ...mockSupabase,
            single: vi.fn(() => Promise.resolve({
              data: singleSellerData,
              error: null
            }))
          }))
        }))
      })

      const { Wrapper } = createWrapper()
      renderHook(() => useSeller('seller-1'), { wrapper: Wrapper })

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('sellers')
      })
    })

    it('handles seller without make assignment', async () => {
      const sellerWithoutMake = {
        ...mockSellersData[1]
      }

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'sellers') {
          return {
            ...mockSupabase,
            select: vi.fn(() => ({
              ...mockSupabase,
              eq: vi.fn(() => ({
                ...mockSupabase,
                single: vi.fn(() => Promise.resolve({
                  data: sellerWithoutMake,
                  error: null
                }))
              }))
            }))
          }
        }
        return {
          ...mockSupabase,
          select: vi.fn(() => ({
            ...mockSupabase,
            eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }
      })

      const { Wrapper } = createWrapper()
      const { result } = renderHook(() => useSeller('seller-2'), { wrapper: Wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data?.make_id).toBeNull()
      expect(result.current.data?.make_name).toBeNull()
    })

    it('returns null for non-existent seller', async () => {
      const { Wrapper } = createWrapper()
      const { result } = renderHook(() => useSeller(''), { wrapper: Wrapper })

      expect(result.current.data).toBe(null)
      expect(result.current.isLoading).toBe(false)
    })

    it('handles seller lookup errors', async () => {
      const mockError = new Error('Seller not found')
      
      mockSupabase.from.mockReturnValue({
        ...mockSupabase,
        select: vi.fn(() => ({
          ...mockSupabase,
          eq: vi.fn(() => ({
            ...mockSupabase,
            single: vi.fn(() => Promise.resolve({
              data: null,
              error: mockError
            }))
          }))
        }))
      })

      const { Wrapper } = createWrapper()
      const { result } = renderHook(() => useSeller('seller-999'), { wrapper: Wrapper })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error?.message).toBe('Der opstod en fejl ved hentning af sælger')
    })
  })

  describe('Query caching and performance', () => {
    it('caches sellers data with appropriate stale time', () => {
      const { Wrapper } = createWrapper()
      const { result: firstResult } = renderHook(() => useSellers(), { wrapper: Wrapper })
      const { result: secondResult } = renderHook(() => useSellers(), { wrapper: Wrapper })

      // Both hooks should share the same query key and cache
      expect(firstResult.current.dataUpdatedAt).toBe(secondResult.current.dataUpdatedAt)
    })

    it('uses proper query keys for individual sellers', async () => {
      mockSupabase.from.mockReturnValue({
        ...mockSupabase,
        select: vi.fn(() => ({
          ...mockSupabase,
          eq: vi.fn(() => ({
            ...mockSupabase,
            single: vi.fn(() => Promise.resolve({
              data: mockSellersData[0],
              error: null
            }))
          }))
        }))
      })

      const { Wrapper, queryClient } = createWrapper()
      renderHook(() => useSeller('seller-1'), { wrapper: Wrapper })

      await waitFor(() => {
        const cache = queryClient.getQueryCache()
        const queries = cache.getAll()
        const sellerQuery = queries.find(q => 
          JSON.stringify(q.queryKey).includes('seller-1')
        )
        expect(sellerQuery).toBeDefined()
      })
    })
  })
})