import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { SlidersHorizontal } from 'lucide-react'
import FilterSkeleton, { FilterChipsSkeleton } from './FilterSkeleton'
import ListingCard from './ListingCard'

interface ListingsSkeletonProps {
  showMobileFilter?: boolean
  showDesktopFilter?: boolean
}

/**
 * Complete Listings Page Skeleton
 * Matches the actual layout structure for seamless loading experience
 */
export const ListingsSkeleton: React.FC<ListingsSkeletonProps> = ({ 
  showMobileFilter = true,
  showDesktopFilter = true 
}) => {
  return (
    <>
      {/* Mobile: Sticky Filter Bar */}
      {showMobileFilter && (
        <div className="lg:hidden sticky top-0 bg-card/95 backdrop-blur-sm border-t border-b border-border/50 z-50">
          <div className="px-4 py-3">
            <div className="flex items-center gap-3 h-8 overflow-x-auto scrollbar-hide">
              <Button
                variant="outline"
                size="sm"
                disabled
                className="flex items-center gap-2 flex-shrink-0 h-8"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </Button>
              
              {/* Mobile Filter Chips Skeleton */}
              <FilterChipsSkeleton />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Wrapper */}
      <div className="container mx-auto px-4 py-6 lg:py-12">
        <div className="flex gap-8 lg:gap-10">
          
          {/* Desktop Sidebar Skeleton */}
          {showDesktopFilter && (
            <aside className="hidden lg:block w-80 xl:w-96 flex-shrink-0">
              <FilterSkeleton />
            </aside>
          )}

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">

            {/* Mobile: Result count skeleton */}
            <div className="lg:hidden flex items-center mb-6">
              <Skeleton className="h-6 w-20" />
            </div>

            {/* Desktop: Result count + sorting + filter chips */}
            <div className="hidden lg:block mb-8">
              {/* Result count and sorting row */}
              <div className="flex justify-between items-center mb-6">
                <Skeleton className="h-6 w-32" />
                
                {/* Sort Dropdown Skeleton */}
                <Skeleton className="h-9 w-36" />
              </div>

              {/* Filter chips skeleton */}
              <FilterChipsSkeleton />
            </div>

            {/* Loading Grid - Matches actual grid layout */}
            <div className="grid gap-6 lg:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <ListingCard key={i} loading={true} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

/**
 * Results Header Skeleton
 * For just the top section with count and sorting
 */
export const ResultsHeaderSkeleton: React.FC = () => {
  return (
    <div className="hidden lg:block mb-8">
      {/* Result count and sorting row */}
      <div className="flex justify-between items-center mb-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-9 w-36" />
      </div>
      
      {/* Filter chips skeleton */}
      <FilterChipsSkeleton />
    </div>
  )
}

/**
 * Mobile Filter Bar Skeleton
 */
export const MobileFilterBarSkeleton: React.FC = () => {
  return (
    <div className="lg:hidden sticky top-0 bg-card/95 backdrop-blur-sm border-t border-b border-border/50 z-50">
      <div className="px-4 py-3">
        <div className="flex items-center gap-3 h-8 overflow-x-auto scrollbar-hide">
          <Button
            variant="outline"
            size="sm"
            disabled
            className="flex items-center gap-2 flex-shrink-0 h-8"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtre
          </Button>
          
          <FilterChipsSkeleton />
        </div>
      </div>
    </div>
  )
}

/**
 * Individual Listing Detail Page Skeleton
 */
export const ListingDetailSkeleton: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Image Gallery Skeleton */}
        <div className="space-y-4">
          {/* Main image */}
          <Skeleton className="w-full h-96 rounded-lg" />
          
          {/* Thumbnail row */}
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="w-20 h-16 rounded-md" />
            ))}
          </div>
        </div>
        
        {/* Details Skeleton */}
        <div className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
          </div>
          
          {/* Price */}
          <div className="space-y-2">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-4 w-full" />
          </div>
          
          {/* Specs grid */}
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-24" />
              </div>
            ))}
          </div>
          
          {/* Action buttons */}
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
      
      {/* Description section */}
      <div className="mt-12 space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  )
}

export default ListingsSkeleton