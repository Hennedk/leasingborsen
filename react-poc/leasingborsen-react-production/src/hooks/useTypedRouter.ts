import { useCallback } from 'react'
import { 
  useNavigate, 
  useRouter,
  useLocation,
  getRouteApi 
} from '@tanstack/react-router'

// Route APIs for type-safe access
const listingsRoute = getRouteApi('/listings')
const listingRoute = getRouteApi('/listing/$id')

// Type-safe navigation hook
export function useTypedNavigate() {
  const navigate = useNavigate()
  
  return {
    toHome: () => navigate({ to: '/' }),
    
    toListings: (search?: any, options?: { replace?: boolean }) => {
      navigate({ 
        to: '/listings',
        search: search ? (prev: any) => ({ ...prev, ...search, page: 1 }) : undefined,
        replace: options?.replace,
      })
    },
    
    toListing: (id: string, options?: { preserveSearch?: boolean; state?: any }) => {
      navigate({ 
        to: '/listing/$id',
        params: { id },
        state: options?.state,
      })
    },
    
    toAdminListings: () => navigate({ to: '/admin/listings' }),
    
    toAdminEditListing: (id: string) => navigate({ 
      to: '/admin/listings/edit/$id',
      params: { id },
    }),
    
    back: () => window.history.back(),
  }
}

// Type-safe search params hook for listings
export function useListingsSearch() {
  try {
    const search = listingsRoute.useSearch()
    const navigate = useNavigate({ from: '/listings' })
    
    const updateSearch = useCallback(
      (updates: Partial<typeof search>) => {
        navigate({
          search: (prev: any) => ({
            ...prev,
            ...updates,
            page: updates.page ?? 1, // Reset page on filter change
          }),
          replace: true,
        })
      },
      [navigate]
    )
    
    const resetSearch = useCallback(() => {
      navigate({ search: {}, replace: true })
    }, [navigate])
    
    return { search, updateSearch, resetSearch }
  } catch {
    // Fallback for when not on listings route
    return { 
      search: {}, 
      updateSearch: () => {}, 
      resetSearch: () => {} 
    }
  }
}

// Type-safe params hook for listing detail
export function useListingParams() {
  try {
    return listingRoute.useParams()
  } catch {
    // Fallback for when not on listing route
    return { id: '' }
  }
}

// Navigation detection hook
export function useNavigationType() {
  const location = useLocation()
  
  // TanStack Router doesn't expose history action the same way
  // We'll use different approach for detecting navigation type
  return { 
    isBack: false, // Will be implemented differently if needed
    isForward: false,
    location 
  }
}