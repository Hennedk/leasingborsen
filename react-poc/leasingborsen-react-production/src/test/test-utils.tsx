import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'

// Mock data for testing
export const mockReferenceData = {
  makes: [
    { id: '1', name: 'Audi' },
    { id: '2', name: 'BMW' },
    { id: '3', name: 'Volkswagen' }
  ],
  models: [
    { id: '1', name: 'A3', make_id: '1' },
    { id: '2', name: 'A4', make_id: '1' },
    { id: '3', name: 'X3', make_id: '2' },
    { id: '4', name: 'Golf', make_id: '3' }
  ],
  bodyTypes: [
    { id: '1', name: 'Hatchback' },
    { id: '2', name: 'Sedan' },
    { id: '3', name: 'SUV' }
  ],
  fuelTypes: [
    { id: '1', name: 'Benzin' },
    { id: '2', name: 'Diesel' },
    { id: '3', name: 'Electric' }
  ],
  transmissions: [
    { id: '1', name: 'Manual' },
    { id: '2', name: 'Automatic' }
  ]
}

export const mockListing = {
  listing_id: 'test-listing-1',
  id: 'test-listing-1',
  make: 'Audi',
  model: 'A3',
  variant: '2.0 TDI',
  body_type: 'Hatchback',
  fuel_type: 'Diesel',
  transmission: 'Automatic',
  year: 2023,
  horsepower: 150,
  seats: 5,
  doors: 4,
  description: 'Test car description',
  monthly_price: 3500,
  seller_id: 'seller-1',
  make_id: '1',
  model_id: '1',
  body_type_id: '1',
  fuel_type_id: '2',
  transmission_id: '2'
}

// Create a test query client
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  })

// Custom render function with providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient()
  
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </BrowserRouter>
  )
}

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

// Mock hooks for testing
export const mockUseReferenceData = {
  data: mockReferenceData,
  isLoading: false,
  error: null
}

export const mockCreateMutation = {
  mutateAsync: vi.fn().mockResolvedValue({ newListing: { id: 'new-listing-id' } }),
  isPending: false,
  isError: false,
  error: null
}

export const mockUpdateMutation = {
  mutateAsync: vi.fn().mockResolvedValue({}),
  isPending: false,
  isError: false,
  error: null
}