import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { 
  Filter, 
  SlidersHorizontal, 
  ArrowUpDown, 
  ChevronDown 
} from 'lucide-react'
import { useInfiniteListings, useListingCount } from '@/hooks/useListings'
import { useInfiniteScroll, useLoadMore } from '@/hooks/useInfiniteScroll'
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
  const [searchParams] = useSearchParams()
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)
  const [showSortDropdown, setShowSortDropdown] = useState(false)
  
  const { 
    makes = [],
    models = [],
    body_type,
    fuel_type,
    transmission,
    price_min,
    price_max,
    seats_min,
    seats_max,
    horsepower_min,
    horsepower_max,
    sortOrder,
    setFilter,
    setSortOrder,
    getActiveFilters,
    resetFilters
  } = useFilterStore()

  // Initialize filters from URL params
  useEffect(() => {
    const urlMake = searchParams.get('make')
    const urlModel = searchParams.get('model')
    const urlBodyType = searchParams.get('body_type')
    const urlFuelType = searchParams.get('fuel_type')
    const urlTransmission = searchParams.get('transmission')
    const urlPriceMin = searchParams.get('price_min')
    const urlPriceMax = searchParams.get('price_max')
    const urlSeatsMin = searchParams.get('seats_min')
    const urlSeatsMax = searchParams.get('seats_max')
    const urlHorsepowerMin = searchParams.get('horsepower_min')
    const urlHorsepowerMax = searchParams.get('horsepower_max')
    const urlSort = searchParams.get('sort')

    if (urlMake && !makes.includes(urlMake)) setFilter('makes', [urlMake])
    if (urlModel && !models.includes(urlModel)) setFilter('models', [urlModel])
    
    // Handle array-based filters
    if (urlBodyType) {
      const bodyTypeArray = urlBodyType.split(',').filter(Boolean)
      if (JSON.stringify(bodyTypeArray) !== JSON.stringify(body_type)) {
        setFilter('body_type', bodyTypeArray)
      }
    }
    if (urlFuelType) {
      const fuelTypeArray = urlFuelType.split(',').filter(Boolean)
      if (JSON.stringify(fuelTypeArray) !== JSON.stringify(fuel_type)) {
        setFilter('fuel_type', fuelTypeArray)
      }
    }
    if (urlTransmission) {
      const transmissionArray = urlTransmission.split(',').filter(Boolean)
      if (JSON.stringify(transmissionArray) !== JSON.stringify(transmission)) {
        setFilter('transmission', transmissionArray)
      }
    }
    
    if (urlPriceMin && parseInt(urlPriceMin) !== price_min) setFilter('price_min', parseInt(urlPriceMin))
    if (urlPriceMax && parseInt(urlPriceMax) !== price_max) setFilter('price_max', parseInt(urlPriceMax))
    if (urlSeatsMin && parseInt(urlSeatsMin) !== seats_min) setFilter('seats_min', parseInt(urlSeatsMin))
    if (urlSeatsMax && parseInt(urlSeatsMax) !== seats_max) setFilter('seats_max', parseInt(urlSeatsMax))
    if (urlHorsepowerMin && parseInt(urlHorsepowerMin) !== horsepower_min) setFilter('horsepower_min', parseInt(urlHorsepowerMin))
    if (urlHorsepowerMax && parseInt(urlHorsepowerMax) !== horsepower_max) setFilter('horsepower_max', parseInt(urlHorsepowerMax))
    if (urlSort && urlSort !== sortOrder) setSortOrder(urlSort as SortOrder)
  }, [searchParams])

  const currentFilters = { 
    makes,
    models,
    body_type, 
    fuel_type, 
    transmission, 
    price_min, 
    price_max, 
    seats_min, 
    seats_max, 
    horsepower_min,
    horsepower_max
  }
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
  const handleSortChange = (newSortOrder: SortOrder) => {
    setSortOrder(newSortOrder)
    setShowSortDropdown(false)
  }

  // Handle filter removal
  const handleRemoveFilter = (key: string) => {
    if (key === 'seats') {
      setFilter('seats_min', null)
      setFilter('seats_max', null)
    } else if (key === 'price') {
      setFilter('price_min', null)
      setFilter('price_max', null)
    } else if (key.startsWith('make:')) {
      // Remove individual make
      const makeToRemove = key.replace('make:', '')
      const updatedMakes = makes.filter(make => make !== makeToRemove)
      setFilter('makes', updatedMakes)
    } else if (key.startsWith('model:')) {
      // Remove individual model
      const modelToRemove = key.replace('model:', '')
      const updatedModels = models.filter(model => model !== modelToRemove)
      setFilter('models', updatedModels)
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
    } else if (key === 'horsepower') {
      setFilter('horsepower_min', null)
      setFilter('horsepower_max', null)
    }
  }

  return (
    /* =================================================
       LISTINGS PAGE LAYOUT - Following homepage container pattern
       Uses BaseLayout with consistent Container component
    ================================================= */
    <BaseLayout>
      {/* Mobile: Sticky Filter Bar - positioned outside Container for proper sticky behavior */}
      <div className="lg:hidden sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border/50 z-50">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3 h-8 overflow-x-auto scrollbar-hide">
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
            
            {/* Mobile Filter Chips - same row as filter button */}
            {activeFilters.length > 0 && (
              <ErrorBoundary minimal>
                <FilterChips
                  activeFilters={activeFilters}
                  onRemoveFilter={handleRemoveFilter}
                  onResetFilters={resetFilters}
                  className="flex-shrink-0"
                  showPlaceholder={false}
                />
              </ErrorBoundary>
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
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSortDropdown(!showSortDropdown)}
                      className="flex items-center gap-2"
                    >
                      <ArrowUpDown className="w-4 h-4" />
                      <span>{currentSortLabel}</span>
                      <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showSortDropdown ? 'rotate-180' : ''}`} />
                    </Button>
                    
                    {showSortDropdown && (
                      <div className="absolute top-full right-0 mt-2 bg-card border border-border rounded-lg shadow-lg py-2 z-50 min-w-[180px]">
                        {sortOptions.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => handleSortChange(option.value)}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors duration-200 ${
                              sortOrder === option.value ? 'text-primary font-medium bg-muted' : ''
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
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
                            window.location.href = '/listings'
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