import React, { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { SlidersHorizontal } from 'lucide-react'
import { useInfiniteListings, useListingCount } from '@/hooks/useListings'
import { useInfiniteScroll, useLoadMore } from '@/hooks/useInfiniteScroll'
import { useUrlSync } from '@/hooks/useUrlSync'
import { usePersistentFilterStore } from '@/stores/persistentFilterStore'
import { useFilterManagement } from '@/hooks/useFilterManagement'
import BaseLayout from '@/components/BaseLayout'
import Container from '@/components/Container'
import FilterSidebar from '@/components/FilterSidebar'
import FilterChips from '@/components/FilterChips'
import MobileFilterOverlay from '@/components/MobileFilterOverlay'
import ListingsHeader from '@/components/listings/ListingsHeader'
import ListingsErrorState from '@/components/listings/ListingsErrorState'
import ListingsGrid from '@/components/listings/ListingsGrid'
import ErrorBoundary from '@/components/ErrorBoundary'
import { listingStyles } from '@/lib/listingStyles'
import type { SortOrder, SortOption } from '@/types'

// Sort options configuration
const sortOptions: SortOption[] = [
  { value: '', label: 'Laveste pris' },
  { value: 'desc', label: 'Højeste pris' }
]

const Listings: React.FC = () => {
  const navigate = useNavigate()
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)
  
  // Use optimized URL sync hook
  const { currentFilters, sortOrder } = useUrlSync()
  
  const { 
    setSortOrder,
    getActiveFilters,
    resetFilters,
    makes,
    models,
    body_type,
    fuel_type,
    transmission,
    price_min,
    price_max,
    seats_min,
    seats_max
  } = usePersistentFilterStore()

  // Use extracted filter management hook
  const { handleRemoveFilter } = useFilterManagement()

  // Use infinite query for listings
  const {
    data: infiniteData,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch
  } = useInfiniteListings(currentFilters, sortOrder)

  // Get total count for display
  const { data: countResponse } = useListingCount(currentFilters)
  
  // Memoize expensive calculations for performance
  const listings = useMemo(
    () => infiniteData?.pages.flatMap(page => page.data || []) || [],
    [infiniteData]
  )
  
  const resultCount = useMemo(
    () => countResponse?.data || listings.length,
    [countResponse?.data, listings.length]
  )
  
  const activeFilters = useMemo(() => getActiveFilters(), [
    getActiveFilters,
    makes,
    models,
    body_type,
    fuel_type, 
    transmission,
    price_min,
    price_max,
    seats_min,
    seats_max
  ])
  
  // Infinite scroll setup
  const { loadMoreRef } = useInfiniteScroll({
    hasNextPage: hasNextPage || false,
    isFetchingNextPage,
    fetchNextPage,
    rootMargin: '200px', // Load more when 200px from bottom
    enabled: !isLoading && !isError
  })
  
  // Manual load more setup as fallback
  const { handleLoadMore, canLoadMore, isLoading: isLoadingMore } = useLoadMore({
    hasNextPage: hasNextPage || false,
    isFetchingNextPage,
    fetchNextPage,
    enabled: !isLoading && !isError
  })

  // Memoize sort label for performance
  const currentSortLabel = useMemo(
    () => sortOptions.find(option => option.value === sortOrder)?.label || 'Laveste pris',
    [sortOrder]
  )

  // Handle sort selection
  const handleSortChange = useCallback((newSortOrder: SortOrder) => {
    setSortOrder(newSortOrder)
  }, [setSortOrder])

  // Handle retry for error state
  const handleRetry = useCallback(() => {
    refetch()
  }, [refetch])

  // Handle navigation to clean listings page
  const handleNavigateToListings = useCallback(() => {
    navigate('/listings')
  }, [navigate])

  return (
    <BaseLayout>
      {/* Mobile: Sticky Filter Bar */}
      <div className={listingStyles.stickyFilterBar}>
        <div className="px-4 py-3">
          <div className="flex items-center gap-3 h-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
              className="flex items-center gap-2 flex-shrink-0 h-8"
              aria-label={`Åben filtre${activeFilters.length > 0 ? ` (${activeFilters.length} aktive)` : ''}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filtre
              {activeFilters.length > 0 && (
                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center">
                  {activeFilters.length}
                </span>
              )}
            </Button>
            
            {/* Mobile Filter Chips */}
            {activeFilters.length > 0 && (
              <div className={listingStyles.scrollContainer}>
                <ErrorBoundary minimal>
                  <FilterChips
                    activeFilters={activeFilters}
                    onRemoveFilter={handleRemoveFilter}
                    onResetFilters={resetFilters}
                    className={listingStyles.filterChip}
                    showPlaceholder={false}
                  />
                </ErrorBoundary>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Container className={listingStyles.contentPadding}>
        <div className="flex gap-8 lg:gap-10">
          
          {/* Desktop Sidebar */}
          <aside className={listingStyles.sidebar}>
            <ErrorBoundary minimal>
              <FilterSidebar />
            </ErrorBoundary>
          </aside>

          {/* Mobile Filter Overlay */}
          <ErrorBoundary>
            <MobileFilterOverlay
              isOpen={mobileFilterOpen}
              onClose={() => setMobileFilterOpen(false)}
              resultCount={resultCount}
              sortOrder={sortOrder}
              onSortChange={handleSortChange}
            />
          </ErrorBoundary>

          {/* Main Content Area */}
          <main className={listingStyles.mainContent} role="main" aria-label="Billeasing søgning">
            
            {/* Mobile: Result count */}
            <div className="lg:hidden flex items-center mb-6">
              <h1 className="text-lg font-bold text-foreground">
                {resultCount} {resultCount === 1 ? 'bil' : 'biler'}
              </h1>
            </div>

            {/* Desktop: Header with sorting */}
            <ListingsHeader
              resultCount={resultCount}
              sortOptions={sortOptions}
              currentSortLabel={currentSortLabel}
              sortOrder={sortOrder}
              onSortChange={handleSortChange}
            />

            {/* Desktop: Filter chips */}
            <div className="hidden lg:block mb-8">
              <FilterChips
                activeFilters={activeFilters}
                onRemoveFilter={handleRemoveFilter}
                onResetFilters={resetFilters}
                className="flex flex-wrap gap-2"
              />
            </div>

            {/* Error State */}
            {(error || isError) && (
              <ListingsErrorState
                error={error}
                onRetry={handleRetry}
              />
            )}

            {/* Results Grid */}
            {!isError && (
              <section aria-label="Søgeresultater">
                <ListingsGrid
                  listings={listings}
                  isLoading={isLoading}
                  isFetchingNextPage={isFetchingNextPage}
                  hasNextPage={hasNextPage || false}
                  canLoadMore={canLoadMore}
                  isLoadingMore={isLoadingMore}
                  loadMoreRef={loadMoreRef}
                  onLoadMore={handleLoadMore}
                  onResetFilters={resetFilters}
                  onNavigateToListings={handleNavigateToListings}
                />
              </section>
            )}

          </main>
        </div>
      </Container>
    </BaseLayout>
  )
}

export default Listings