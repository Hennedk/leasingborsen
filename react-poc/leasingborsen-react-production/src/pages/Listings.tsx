import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { useNavigate, getRouteApi } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { SlidersHorizontal } from 'lucide-react'
import { useInfiniteListings, useListingCount } from '@/hooks/useListings'
import { useNavigationContext } from '@/hooks/useNavigationContext'
import { useInfiniteScroll, useLoadMore } from '@/hooks/useInfiniteScroll'
import { usePersistentFilterStore } from '@/stores/consolidatedFilterStore'
import { useFilterManagement } from '@/hooks/useFilterManagement'
import { useUrlSync } from '@/hooks/useUrlSync'
import { useListingsScrollRestoration } from '@/hooks/useListingsScrollRestoration'
import BaseLayout from '@/components/BaseLayout'
import Container from '@/components/Container'
import FilterSidebar from '@/components/FilterSidebar'
import FilterChips from '@/components/FilterChips'
import MobileFilterOverlay from '@/components/MobileFilterOverlay'
import ListingsHeader from '@/components/listings/ListingsHeader'
import ListingsErrorState from '@/components/listings/ListingsErrorState'
import ListingsGrid from '@/components/listings/ListingsGrid'
import MobileSortStatus from '@/components/listings/MobileSortStatus'
import MobileSortButton from '@/components/listings/MobileSortButton'
import { 
  DataErrorBoundary, 
  SearchErrorBoundary, 
  ComponentErrorBoundary 
} from '@/components/ErrorBoundaries'
import { listingStyles } from '@/lib/listingStyles'
import type { SortOrder, SortOption } from '@/types'

// Sort options configuration
const sortOptions: SortOption[] = [
  { value: 'lease_score_desc', label: 'Bedste tilbud' },
  { value: 'asc', label: 'Laveste pris' },
  { value: 'desc', label: 'Højeste pris' }
]

const listingsRoute = getRouteApi('/listings')

const Listings: React.FC = () => {
  const navigate = useNavigate({ from: '/listings' })
  const { updateListingSnapshotMetadata } = useNavigationContext()
  const search = listingsRoute.useSearch()
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)
  
  // Use URL sync hook for bidirectional filter synchronization
  const { currentFilters, sortOrder } = useUrlSync()
  
  const { 
    getActiveFilters,
    resetFilters,
    setSortOrder,
    handleResultsSettled
  } = usePersistentFilterStore()

  // Use extracted filter management hook
  const { handleRemoveFilter } = useFilterManagement()

  // Check for showFilters URL parameter to automatically open mobile filter overlay
  useEffect(() => {
    if (search.showFilters === 'true') {
      setMobileFilterOpen(true)
      
      // Clean up the showFilters parameter from URL
      const { showFilters, ...cleanSearch } = search
      navigate({ 
        search: cleanSearch,
        replace: true 
      })
    }
  }, [search, navigate])

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
  const { data: countResponse } = useListingCount(currentFilters, sortOrder)
  
  const listMetadata = useMemo(() => {
    const pages = infiniteData?.pages
    if (!pages || pages.length === 0) return null

    const pagesWithData = pages.filter((page) => Array.isArray(page.data) && page.data?.length)
    if (pagesWithData.length === 0) return null

    const firstPage = pagesWithData[0]
    const lastPage = pagesWithData[pagesWithData.length - 1]

    const firstEntry = firstPage.data?.[0]
    const lastEntries = lastPage.data
    const lastEntry = lastEntries ? lastEntries[lastEntries.length - 1] : undefined

    const firstIdValue = firstEntry?.id ?? firstEntry?.listing_id ?? undefined
    const lastIdValue = lastEntry?.id ?? lastEntry?.listing_id ?? undefined

    return {
      loadedPageCount: pagesWithData.length,
      firstId: firstIdValue,
      lastId: lastIdValue
    }
  }, [infiniteData?.pages])

  // Analytics: Track when results settle
  useEffect(() => {
    if (infiniteData && !isFetchingNextPage && !isLoading) {
      // Results have settled - calculate total count and latency
      const totalCount = infiniteData.pages.reduce(
        (sum, page) => sum + (page.data?.length || 0), 0
      )
      
      // Use count response if available, otherwise use total from pages
      const actualCount = countResponse?.data ?? totalCount
      
      // Notify store that results have settled
      // Store now uses getAccurateLatency() internally for precise timing
      handleResultsSettled({
        count: actualCount,
        pages: infiniteData.pages.length,
        data: infiniteData.pages.flatMap(page => page.data || [])
      })
    }
  }, [infiniteData, isFetchingNextPage, isLoading, countResponse, handleResultsSettled])
  
  useEffect(() => {
    if (!listMetadata) return
    if (typeof window === 'undefined') return

    const filters = new URLSearchParams(window.location.search)
    updateListingSnapshotMetadata(listMetadata, filters)
  }, [listMetadata, updateListingSnapshotMetadata])

  // Enable scroll restoration for this page with enhanced settings for better UX
  useListingsScrollRestoration(true, listMetadata)
  
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
    currentFilters
  ])
  
  // Calculate current page for navigation context
  const currentPage = useMemo(() => {
    return infiniteData?.pages?.length || 1
  }, [infiniteData?.pages?.length])
  
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
    navigate({ to: '/listings' })
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
              {activeFilters.length > 0 && (
                <span className="bg-surface-brand text-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center">
                  {activeFilters.length}
                </span>
              )}
            </Button>
            
            {/* Mobile Filter Chips */}
            {activeFilters.length > 0 && (
              <div className={listingStyles.scrollContainer}>
                <SearchErrorBoundary searchContext="mobile-filter-chips">
                  <FilterChips
                    activeFilters={activeFilters}
                    onRemoveFilter={handleRemoveFilter}
                    onResetFilters={resetFilters}
                    className={listingStyles.filterChip}
                    showPlaceholder={false}
                  />
                </SearchErrorBoundary>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Container className={listingStyles.contentPadding}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-10">
          
          {/* Desktop Sidebar */}
          <aside className={listingStyles.sidebar}>
            <SearchErrorBoundary searchContext="desktop-filters">
              <FilterSidebar />
            </SearchErrorBoundary>
          </aside>

          {/* Mobile Filter Overlay */}
          <SearchErrorBoundary searchContext="mobile-filter-overlay">
            <MobileFilterOverlay
              isOpen={mobileFilterOpen}
              onClose={() => setMobileFilterOpen(false)}
              resultCount={resultCount}
              sortOrder={sortOrder}
              onSortChange={handleSortChange}
            />
          </SearchErrorBoundary>

          {/* Main Content Area */}
          <main 
            className={listingStyles.mainContent} 
            role="main" 
            aria-label="Billeasing søgning"
          >

            {/* Mobile: Result count, sort status and sort button */}
            <div className="lg:hidden mb-4 flex items-end justify-between">
              <div className="space-y-1">
                <h1 className="text-base font-bold text-foreground leading-tight">
                  {resultCount} {resultCount === 1 ? 'tilbud fundet' : 'tilbud fundet'}
                </h1>
                <MobileSortStatus currentSortLabel={currentSortLabel} />
              </div>
              {listings.length > 0 && (
                <MobileSortButton
                  sortOptions={sortOptions}
                  sortOrder={sortOrder}
                  onSortChange={handleSortChange}
                />
              )}
            </div>

            {/* Desktop: Header with sorting */}
            <ComponentErrorBoundary componentName="ListingsHeader">
              <ListingsHeader
                resultCount={resultCount}
                sortOptions={sortOptions}
                sortOrder={sortOrder}
                onSortChange={handleSortChange}
              />
            </ComponentErrorBoundary>


            {/* Desktop: Filter chips */}
            <div className="hidden lg:block mb-8">
              <SearchErrorBoundary searchContext="desktop-filter-chips">
                <FilterChips
                  activeFilters={activeFilters}
                  onRemoveFilter={handleRemoveFilter}
                  onResetFilters={resetFilters}
                  className="flex flex-wrap gap-2"
                />
              </SearchErrorBoundary>
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
                <DataErrorBoundary onRetry={handleRetry}>
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
                    currentPage={currentPage}
                  />
                </DataErrorBoundary>
              </section>
            )}

          </main>
        </div>
      </Container>
    </BaseLayout>
  )
}

export default Listings
