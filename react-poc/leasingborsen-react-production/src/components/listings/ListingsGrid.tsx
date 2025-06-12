import React, { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Filter } from 'lucide-react'
import ListingCard from '@/components/ListingCard'
import { listingStyles } from '@/lib/listingStyles'
import { cn } from '@/lib/utils'
import type { CarListing } from '@/types'

interface ListingsGridProps {
  listings: CarListing[]
  isLoading: boolean
  isFetchingNextPage: boolean
  hasNextPage: boolean
  canLoadMore: boolean
  isLoadingMore: boolean
  loadMoreRef: React.RefObject<HTMLDivElement | null>
  onLoadMore: () => void
  onResetFilters: () => void
  onNavigateToListings: () => void
  className?: string
}

/**
 * Optimized listings grid with memoized rendering and proper loading states
 * Handles empty states, infinite scroll, and accessibility
 */
const ListingsGrid: React.FC<ListingsGridProps> = ({
  listings,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  canLoadMore,
  isLoadingMore,
  loadMoreRef,
  onLoadMore,
  onResetFilters,
  onNavigateToListings,
  className
}) => {
  // Memoize skeleton count to prevent unnecessary re-renders
  const skeletonCount = useMemo(() => (isFetchingNextPage ? 6 : 9), [isFetchingNextPage])

  // Loading state
  if (isLoading) {
    return (
      <div className={cn(listingStyles.gridContainer, className)} role="status" aria-label="Indlæser annoncer">
        {Array.from({ length: 9 }, (_, i) => (
          <ListingCard key={`skeleton-${i}`} loading={true} />
        ))}
        <span className="sr-only">Indlæser billeasing annoncer...</span>
      </div>
    )
  }

  // Empty state
  if (listings.length === 0) {
    return (
      <div className={cn(listingStyles.emptyState, className)}>
        <div className="max-w-md mx-auto space-y-6">
          <div className={listingStyles.largeIconContainer}>
            <Filter className="w-10 h-10 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              Ingen biler fundet
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Der er ingen biler, der matcher dine søgekriterier. 
              Prøv at justere filtrene for at se flere resultater.
            </p>
          </div>
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              onResetFilters()
              onNavigateToListings()
            }}
            className="mt-6"
          >
            Nulstil alle filtre
          </Button>
        </div>
      </div>
    )
  }

  // Results grid
  return (
    <div className={className}>
      {/* Main results grid */}
      <div 
        className={listingStyles.gridContainer}
        role="grid"
        aria-label={`${listings.length} billeasing annoncer`}
      >
        {listings.map((car, index) => (
          <ListingCard 
            key={car.listing_id || car.id || `listing-${index}`} 
            car={{
              ...car,
              id: car.listing_id || car.id
            }}
          />
        ))}
      </div>
      
      {/* Loading more items */}
      {isFetchingNextPage && (
        <div className={cn(listingStyles.gridContainer, listingStyles.loadingSection)} role="status">
          {Array.from({ length: skeletonCount }, (_, i) => (
            <ListingCard key={`loading-more-${i}`} loading={true} />
          ))}
          <span className="sr-only">Indlæser flere annoncer...</span>
        </div>
      )}
      
      {/* Intersection observer trigger */}
      <div ref={loadMoreRef} className="h-1" aria-hidden="true" />
      
      {/* Manual load more button */}
      {canLoadMore && (
        <div className="text-center mt-16 lg:mt-20">
          <Button 
            variant="outline" 
            size="lg"
            onClick={onLoadMore}
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
            <div className={listingStyles.iconContainer}>
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
    </div>
  )
}

export default React.memo(ListingsGrid)