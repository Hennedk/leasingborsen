import { describe, expect, it, vi, beforeEach, afterAll } from 'vitest'
import { CarListingQueries, supabase } from '../src/lib/supabase'

// --- Supabase mock helpers -------------------------------------------------

const deepClone = <T>(value: T): T => (value == null ? value : JSON.parse(JSON.stringify(value)))

type MockResponse = {
  data: any
  error: Error | null
}

let defaultResponse: MockResponse = { data: [], error: null }
let responseQueue: MockResponse[] = []

const shiftResponse = (): MockResponse => {
  if (responseQueue.length > 0) {
    const next = responseQueue.shift()!
    return { data: deepClone(next.data), error: next.error }
  }
  return { data: deepClone(defaultResponse.data), error: defaultResponse.error }
}

const createQueryBuilder = () => {
  const response = shiftResponse()
  const produce = () => ({ data: deepClone(response.data), error: response.error })

  const builder: any = {
    select: vi.fn(() => builder),
    not: vi.fn(() => builder),
    in: vi.fn(() => builder),
    ilike: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    lte: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => Promise.resolve(produce())),
    range: vi.fn(() => builder),
    then: (onFulfilled?: (value: MockResponse) => unknown, onRejected?: (reason: unknown) => unknown) =>
      Promise.resolve(produce()).then(onFulfilled, onRejected),
  }

  return builder
}

const setSupabaseDefaultResponse = (data: any, error: Error | null = null) => {
  defaultResponse = { data: deepClone(data), error }
  responseQueue = []
}

const queueSupabaseResponses = (...responses: MockResponse[]) => {
  responseQueue = responses.map(({ data, error }) => ({
    data: deepClone(data),
    error: error ?? null,
  }))
}

// --- Shared mock data -------------------------------------------------------

const baseListings = [
  {
    id: 'listing-1',
    listing_id: 'listing-1',
    make: 'Toyota',
    model: 'Corolla',
    retail_price: 220000,
    mileage_per_year: 15000,
    period_months: 36,
    first_payment: 35000,
    updated_at: '2025-01-01T00:00:00Z',
    lease_pricing: [
      {
        mileage_per_year: 15000,
        period_months: 36,
        first_payment: 35000,
        monthly_price: 4500, // Ideal (above cap)
      },
      {
        mileage_per_year: 15000,
        period_months: 36,
        first_payment: 0,
        monthly_price: 4200, // Within cap, different deposit
      },
    ],
  },
  {
    id: 'listing-2',
    listing_id: 'listing-2',
    make: 'Honda',
    model: 'Civic',
    retail_price: 200000,
    mileage_per_year: 15000,
    period_months: 36,
    first_payment: 35000,
    updated_at: '2025-01-02T00:00:00Z',
    lease_pricing: [
      {
        mileage_per_year: 15000,
        period_months: 36,
        first_payment: 35000,
        monthly_price: 3500,
      },
    ],
  },
  {
    id: 'listing-3',
    listing_id: 'listing-3',
    make: 'BMW',
    model: 'X3',
    retail_price: 350000,
    mileage_per_year: 15000,
    period_months: 36,
    first_payment: 35000,
    updated_at: '2025-01-03T00:00:00Z',
    lease_pricing: [
      {
        mileage_per_year: 15000,
        period_months: 36,
        first_payment: 35000,
        monthly_price: 5000,
      },
    ],
  },
]

const listingIds = (result: Awaited<ReturnType<typeof CarListingQueries.getListings>>) =>
  result.data?.map((listing) => listing.id) ?? []

const originalSupabaseFrom = supabase.from
let supabaseFromMock: ReturnType<typeof vi.fn> | null = null

beforeEach(() => {
  supabaseFromMock = vi.fn(() => createQueryBuilder())
  ;(supabase as unknown as { from: typeof supabase.from }).from = supabaseFromMock as unknown as typeof supabase.from
  setSupabaseDefaultResponse(baseListings)
})

afterAll(() => {
  ;(supabase as unknown as { from: typeof supabase.from }).from = originalSupabaseFrom
})

// --- Tests ------------------------------------------------------------------

describe('CarListingQueries.getListings – price cap integration', () => {
  it('filters out listings that only have offers above the price cap', async () => {
    const filters = { price_max: 4200, mileage_selected: 15000 }

    const result = await CarListingQueries.getListings(filters, 20, 'price_asc', 0)

    expect(result.error).toBeNull()
    expect(result.data).toBeDefined()
    expect(listingIds(result)).toContain('listing-1')
    expect(listingIds(result)).toContain('listing-2')
    expect(listingIds(result)).not.toContain('listing-3')
  })

  it('exposes price cap metadata when display and ideal offers differ', async () => {
    const filters = { price_max: 4200, mileage_selected: 15000 }

    const result = await CarListingQueries.getListings(filters, 20, 'price_asc', 0)
    const toyota = result.data?.find((listing) => listing.id === 'listing-1')

    expect(result.error).toBeNull()
    expect(toyota).toBeDefined()
    expect(toyota?.display_price_reason).toBe('price_cap_best_fit')
    expect(toyota?.display_monthly_price).toBe(4200)
    expect(toyota?.ideal_monthly_price).toBe(4500)
    expect(toyota?.ideal_deposit).toBe(35000)
    expect(toyota?.price_cap_delta).toBe(300)
  })

  it('uses updated_at as final tie-breaker for identical prices', async () => {
    const samePriceListings = [
      {
        id: 'listing-a',
        listing_id: 'listing-a',
        make: 'Ford',
        model: 'Focus',
        retail_price: 180000,
        updated_at: '2025-01-01T00:00:00Z',
        lease_pricing: [
          {
            mileage_per_year: 15000,
            period_months: 36,
            first_payment: 35000,
            monthly_price: 4000,
          },
        ],
      },
      {
        id: 'listing-b',
        listing_id: 'listing-b',
        make: 'Ford',
        model: 'Puma',
        retail_price: 185000,
        updated_at: '2025-01-03T00:00:00Z',
        lease_pricing: [
          {
            mileage_per_year: 15000,
            period_months: 36,
            first_payment: 35000,
            monthly_price: 4000,
          },
        ],
      },
      {
        id: 'listing-c',
        listing_id: 'listing-c',
        make: 'Ford',
        model: 'Fiesta',
        retail_price: 175000,
        updated_at: '2025-01-02T00:00:00Z',
        lease_pricing: [
          {
            mileage_per_year: 15000,
            period_months: 36,
            first_payment: 35000,
            monthly_price: 4000,
          },
        ],
      },
    ]

    setSupabaseDefaultResponse(samePriceListings)

    const result = await CarListingQueries.getListings({ price_max: 4500, mileage_selected: 15000 }, 20, 'price_asc', 0)

    expect(result.error).toBeNull()
    expect(result.data?.map((listing) => listing.id)).toEqual(['listing-b', 'listing-c', 'listing-a'])
  })

  it('respects pagination after filtering and sorting', async () => {
    const filters = { price_max: 6000, mileage_selected: 15000 }

    const result = await CarListingQueries.getListings(filters, 1, 'price_asc', 1)

    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(1)
    expect(result.data?.[0].id).toBe('listing-1')
  })
})

describe('CarListingQueries.getListingCount – price cap integration', () => {
  it('matches visible listings when a price cap is applied', async () => {
    const filters = { price_max: 4200, mileage_selected: 15000 }

    const result = await CarListingQueries.getListingCount(filters)

    expect(result.error).toBeNull()
    expect(result.data).toBe(2)
  })

  it('returns zero when no listings match the cap', async () => {
    setSupabaseDefaultResponse([])

    const result = await CarListingQueries.getListingCount({ price_max: 1000, mileage_selected: 15000 })

    expect(result.error).toBeNull()
    expect(result.data).toBe(0)
  })

  it('stays in sync with getListings results', async () => {
    queueSupabaseResponses(
      { data: baseListings, error: null },
      { data: baseListings, error: null }
    )

    const filters = { price_max: 4200, mileage_selected: 15000 }

    const [countResult, listResult] = await Promise.all([
      CarListingQueries.getListingCount(filters),
      CarListingQueries.getListings(filters, 100, 'price_asc', 0),
    ])

    expect(countResult.error).toBeNull()
    expect(listResult.error).toBeNull()
    expect(countResult.data).toBe(listResult.data?.length)
  })
})

describe('CarListingQueries price cap edge cases', () => {
  it('deduplicates listings returned with multiple rows', async () => {
    const duplicateRows = [
      {
        id: 'listing-1',
        listing_id: 'listing-1',
        updated_at: '2025-01-01T00:00:00Z',
        retail_price: 220000,
        lease_pricing: [
          { mileage_per_year: 15000, period_months: 36, first_payment: 35000, monthly_price: 4000 },
        ],
      },
      {
        id: 'listing-1',
        listing_id: 'listing-1',
        updated_at: '2025-01-02T00:00:00Z',
        retail_price: 220000,
        lease_pricing: [
          { mileage_per_year: 15000, period_months: 24, first_payment: 20000, monthly_price: 3800 },
        ],
      },
      {
        id: 'listing-2',
        listing_id: 'listing-2',
        updated_at: '2025-01-03T00:00:00Z',
        retail_price: 200000,
        lease_pricing: [
          { mileage_per_year: 15000, period_months: 36, first_payment: 35000, monthly_price: 3500 },
        ],
      },
    ]

    setSupabaseDefaultResponse(duplicateRows)

    const result = await CarListingQueries.getListings({ price_max: 5000, mileage_selected: 15000 }, 20, 'price_desc', 0)

    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(2)
    expect(new Set(result.data?.map((listing) => listing.id))).toEqual(new Set(['listing-1', 'listing-2']))
  })

  it('propagates Supabase errors to the caller', async () => {
    const mockError = new Error('Supabase connection failed')
    setSupabaseDefaultResponse([], mockError)

    const result = await CarListingQueries.getListings({ price_max: 4200, mileage_selected: 15000 }, 20, 'price_asc', 0)

    expect(result.data).toBeNull()
    expect(result.error).toBe(mockError)
  })
})
