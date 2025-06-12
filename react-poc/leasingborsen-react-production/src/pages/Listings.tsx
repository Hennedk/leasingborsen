import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Filter, 
  SlidersHorizontal, 
  ArrowUpDown, 
  ChevronDown 
} from 'lucide-react'
import { useInfiniteListings, useListingCount } from '@/hooks/useListings'
import { useInfiniteScroll, useLoadMore } from '@/hooks/useInfiniteScroll'
import { useUrlSync } from '@/hooks/useUrlSync'
import { useFilterStore } from '@/stores/filterStore'
import BaseLayout from '@/components/BaseLayout'
import Container from '@/components/Container'
import FilterSidebar from '@/components/FilterSidebar'
import FilterChips from '@/components/FilterChips'
import MobileFilterOverlay from '@/components/MobileFilterOverlay'
import ListingCard from '@/components/ListingCard'
import ErrorBoundary from '@/components/ErrorBoundary'
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
    setFilter,
    setSortOrder,
    getActiveFilters,
    resetFilters
  } = useFilterStore()

  // URL sync is now handled by the useUrlSync hook
  // Use infinite query for listings
  const {
    data: infiniteData,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteListings(currentFilters, sortOrder)

  // Get total count for display
  const { data: countResponse } = useListingCount(currentFilters)
  
  // Flatten all pages into single array
  const listings = infiniteData?.pages.flatMap(page => page.data || []) || []
  const resultCount = countResponse?.data || listings.length
  const activeFilters = getActiveFilters()
  
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

  // Get current sort label
  const currentSortLabel = sortOptions.find(option => option.value === sortOrder)?.label || 'Laveste pris'

  // Handle sort selection
  const handleSortChange = useCallback((newSortOrder: SortOrder) => {
    setSortOrder(newSortOrder)
  }, [setSortOrder])

  // Optimized filter removal with useCallback
  const handleRemoveFilter = useCallback((key: string) => {
    const { makes, models, fuel_type, body_type, transmission } = currentFilters
    
    if (key === 'seats') {
      setFilter('seats_min', null)
      setFilter('seats_max', null)
    } else if (key === 'price') {
      setFilter('price_min', null)
      setFilter('price_max', null)
    } else if (key.startsWith('make:')) {
      const makeToRemove = key.replace('make:', '')
      const updatedMakes = makes.filter(make => make !== makeToRemove)
      setFilter('makes', updatedMakes)
    } else if (key.startsWith('model:')) {
      const modelToRemove = key.replace('model:', '')
      const updatedModels = models.filter(model => model !== modelToRemove)
      setFilter('models', updatedModels)
    } else if (key.startsWith('fuel_type:')) {
      const fuelTypeToRemove = key.replace('fuel_type:', '')
      const updatedFuelTypes = (fuel_type || []).filter(ft => ft !== fuelTypeToRemove)
      setFilter('fuel_type', updatedFuelTypes)
    } else if (key.startsWith('body_type:')) {
      const bodyTypeToRemove = key.replace('body_type:', '')
      const updatedBodyTypes = (body_type || []).filter(bt => bt !== bodyTypeToRemove)
      setFilter('body_type', updatedBodyTypes)
    } else if (key.startsWith('transmission:')) {
      const transmissionToRemove = key.replace('transmission:', '')
      const updatedTransmissions = (transmission || []).filter(t => t !== transmissionToRemove)
      setFilter('transmission', updatedTransmissions)
    } else if (key === 'makes') {
      setFilter('makes', [])
    } else if (key === 'models') {
      setFilter('models', [])
    } else if (key === 'body_type') {
      setFilter('body_type', [])
    } else if (key === 'fuel_type') {
      setFilter('fuel_type', [])
    } else if (key === 'transmission') {
      setFilter('transmission', [])
    }
  }, [currentFilters, setFilter])

  return (
    /* =================================================
       LISTINGS PAGE LAYOUT - Following homepage container pattern
       Uses BaseLayout with consistent Container component
    ================================================= */
    <BaseLayout>
      {/* Mobile: Sticky Filter Bar - positioned outside Container for proper sticky behavior */}
      <div className="lg:hidden sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border/50 z-50">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3 h-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
              className="flex items-center gap-2 flex-shrink-0 h-8"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filtre
              {activeFilters.length > 0 && (
                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center">
                  {activeFilters.length}
                </span>
              )}
            </Button>
            
            {/* Mobile Filter Chips - horizontal scroll only applies to chips container */}
            {activeFilters.length > 0 && (
              <div className="flex-1 overflow-x-auto scrollbar-hide">
                <ErrorBoundary minimal>
                  <FilterChips
                    activeFilters={activeFilters}
                    onRemoveFilter={handleRemoveFilter}
                    onResetFilters={resetFilters}
                    className="flex-shrink-0"
                    showPlaceholder={false}
                  />
                </ErrorBoundary>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =================
          MAIN CONTENT WRAPPER - Using consistent Container component
      ================= */}
      <Container className="py-6 lg:py-12">
          {/* =================
              MAIN CONTENT LAYOUT - Improved spacing and layout
          ================= */}
          <div className="flex gap-8 lg:gap-10">
            
            {/* Desktop Sidebar - Enhanced width and styling */}
            <aside className="hidden lg:block w-80 xl:w-96 flex-shrink-0">
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
              />
            </ErrorBoundary>

            {/* Main Content Area - Enhanced spacing */}
            <div className="flex-1 min-w-0">

              {/* Mobile: Result count */}
              <div className="lg:hidden flex items-center mb-6">
                <span className="text-lg font-bold text-foreground">
                  {resultCount} {resultCount === 1 ? 'bil' : 'biler'}
                </span>
              </div>

              {/* Desktop: Result count + sorting + filter chips */}
              <div className="hidden lg:block mb-8">
                {/* Live region for screen readers */}
                <div 
                  aria-live="polite" 
                  aria-atomic="true" 
                  className="sr-only"
                  id="results-announcement"
                >
                  Søgeresultater opdateret: {resultCount} {resultCount === 1 ? 'bil fundet' : 'biler fundet'}
                </div>
                
                {/* Result count and sorting row */}
                <div className="flex justify-between items-center mb-6">
                  <span className="text-xl font-bold text-foreground">
                    {resultCount} {resultCount === 1 ? 'bil fundet' : 'biler fundet'}
                  </span>
                  
                  {/* Sort Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <ArrowUpDown className="w-4 h-4" />
                        <span>{currentSortLabel}</span>
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[180px]">
                      {sortOptions.map((option) => (
                        <DropdownMenuItem
                          key={option.value}
                          onClick={() => handleSortChange(option.value)}
                          className={`cursor-pointer ${
                            sortOrder === option.value ? 'text-primary font-medium bg-muted' : ''
                          }`}
                        >
                          {option.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Filter chips */}
                <FilterChips
                  activeFilters={activeFilters}
                  onRemoveFilter={handleRemoveFilter}
                  onResetFilters={resetFilters}
                  className="flex flex-wrap gap-2"
                />
              </div>

              
              {/* Error State - Enhanced styling */}
              {(error || isError) && (
                <div className="bg-destructive/10 text-destructive border border-destructive/20 p-6 rounded-lg mb-8">
                  <h3 className="font-semibold mb-2">Der opstod en fejl</h3>
                  <p>Der opstod en fejl ved indlæsning af biler. Prøv igen senere.</p>
                </div>
              )}

              {/* Loading State - Grid layout */}
              {isLoading && (
                <div className="grid gap-6 lg:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <ListingCard key={i} loading={true} />
                  ))}
                </div>
              )}

              {/* Results Display - Grid layout with infinite scroll */}
              {!isLoading && !isError && (
                <>
                  {listings.length > 0 ? (
                    <>
                      <div className="grid gap-6 lg:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                        {listings.map((car, index) => (
                          <ListingCard 
                            key={`${car.listing_id || car.id}-${index}`} 
                            car={{
                              ...car,
                              id: car.listing_id || car.id
                            }} 
                          />
                        ))}
                      </div>
                      
                      {/* Loading more items skeleton */}
                      {isFetchingNextPage && (
                        <div className="grid gap-6 lg:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 mt-6 lg:mt-8">
                          {Array.from({ length: 6 }).map((_, i) => (
                            <ListingCard key={`loading-${i}`} loading={true} />
                          ))}
                        </div>
                      )}
                      
                      {/* Intersection observer trigger */}
                      <div ref={loadMoreRef} className="h-1" />
                      
                      {/* Manual load more button as fallback */}
                      {canLoadMore && (
                        <div className="text-center mt-16 lg:mt-20">
                          <Button 
                            variant="outline" 
                            size="lg"
                            onClick={handleLoadMore}
                            disabled={isLoadingMore}
                            className="px-8 py-3 font-semibold"
                          >
                            {isLoadingMore ? 'Indlæser...' : 'Indlæs flere biler'}
                          </Button>
                        </div>
                      )}
                      
                      {/* End of results indicator */}
                      {!hasNextPage && listings.length > 20 && (
                        <div className="text-center mt-16 lg:mt-20 py-8">
                          <div className="max-w-md mx-auto space-y-4">
                            <div className="w-12 h-12 mx-auto bg-muted rounded-full flex items-center justify-center">
                              <Filter className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <div className="space-y-2">
                              <h3 className="text-lg font-semibold text-foreground">
                                Du har set alle resultater
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {listings.length} biler fundet med dine søgekriterier
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    /* Enhanced Empty State */
                    <div className="text-center py-16 lg:py-20">
                      <div className="max-w-md mx-auto space-y-6">
                        <div className="w-20 h-20 mx-auto bg-muted rounded-full flex items-center justify-center">
                          <Filter className="w-10 h-10 text-muted-foreground" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-2xl font-bold text-foreground">
                            Ingen biler fundet
                          </h3>
                          <p className="text-muted-foreground leading-relaxed">
                            Der er ingen biler, der matcher dine søgekriterier. 
                            Prøv at justere filtrene for at se flere resultater.
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={() => {
                            resetFilters()
                            navigate('/listings')
                          }}
                          className="mt-6"
                        >
                          Nulstil alle filtre
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
      </Container>
    </BaseLayout>
  )
}

export default Listings