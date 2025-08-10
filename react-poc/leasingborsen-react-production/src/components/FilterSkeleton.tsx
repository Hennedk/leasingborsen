import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface FilterSkeletonProps {
  className?: string
}

const FilterSkeleton: React.FC<FilterSkeletonProps> = ({ className = '' }) => {
  return (
    <div className={className}>
      <Card className="bg-card border border-border gap-0">
        <CardHeader className="pb-3 pt-8">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-foreground">
                Filtrér
              </CardTitle>
            </div>
            
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-2 pb-8">
          {/* Vehicle Selection Section */}
          <div className="space-y-4">
            
            {/* Make Filter Skeleton */}
            <div className="space-y-3">
              <Skeleton className="h-5 w-16" /> {/* Label */}
              <Skeleton className="h-11 w-full rounded-md" /> {/* Button */}
            </div>

            {/* Model Filter Skeleton */}
            <div className="space-y-3">
              <Skeleton className="h-5 w-16" /> {/* Label */}
              <Skeleton className="h-11 w-full rounded-md" /> {/* Button */}
            </div>

            {/* Fuel Type Filter Skeleton */}
            <div className="space-y-3">
              <Skeleton className="h-5 w-20" /> {/* Label */}
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton 
                    key={index} 
                    className="h-8 rounded-full" 
                    style={{ width: `${60 + Math.random() * 40}px` }}
                  />
                ))}
              </div>
            </div>

            {/* Transmission Filter Skeleton */}
            <div className="space-y-3">
              <Skeleton className="h-5 w-20" /> {/* Label */}
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 2 }).map((_, index) => (
                  <Skeleton 
                    key={index} 
                    className="h-8 w-20 rounded-full"
                  />
                ))}
              </div>
            </div>

            {/* Body Type Filter Skeleton */}
            <div className="space-y-3">
              <Skeleton className="h-5 w-16" /> {/* Label */}
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton 
                    key={index} 
                    className="h-8 rounded-full" 
                    style={{ width: `${50 + Math.random() * 60}px` }}
                  />
                ))}
              </div>
            </div>

            {/* Price Range Filter Skeleton */}
            <div className="space-y-3">
              <Skeleton className="h-5 w-24" /> {/* Label */}
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-11 rounded-md" />
                <Skeleton className="h-11 rounded-md" />
              </div>
            </div>

            {/* Seat Count Filter Skeleton */}
            <div className="space-y-3">
              <Skeleton className="h-5 w-24" /> {/* Label */}
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-11 rounded-md" />
                <Skeleton className="h-11 rounded-md" />
              </div>
            </div>

            {/* Horsepower Range Filter Skeleton */}
            <div className="space-y-3">
              <Skeleton className="h-5 w-28" /> {/* Label */}
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-11 rounded-md" />
                <Skeleton className="h-11 rounded-md" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Mobile Filter Overlay Skeleton
 */
export const MobileFilterSkeleton: React.FC = () => {
  return (
    <div className="mobile-overlay-container">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Slide-up overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl border-t border-border/50 mobile-overlay flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-5 w-5 rounded-full" />
          </div>
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-4 space-y-6">
            {/* Filter sections */}
            {Array.from({ length: 8 }).map((_, sectionIndex) => (
              <div key={sectionIndex} className="space-y-3">
                <Skeleton className="h-5 w-20" />
                
                {/* Different layouts for different filter types */}
                {sectionIndex < 2 ? (
                  // Button-style filters (Make/Model)
                  <Skeleton className="h-11 w-full rounded-md" />
                ) : sectionIndex < 5 ? (
                  // Chip-style filters (Fuel, Transmission, Body Type)
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 3 + Math.floor(Math.random() * 4) }).map((_, chipIndex) => (
                      <Skeleton 
                        key={chipIndex}
                        className="h-8 rounded-full"
                        style={{ width: `${50 + Math.random() * 50}px` }}
                      />
                    ))}
                  </div>
                ) : (
                  // Dropdown-style filters (Price, Seats, Horsepower)
                  <div className="grid grid-cols-2 gap-3">
                    <Skeleton className="h-11 rounded-md" />
                    <Skeleton className="h-11 rounded-md" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Footer */}
        <div className="sticky bottom-0 p-4 border-t border-border/50 bg-background flex-shrink-0 mobile-overlay-footer">
          <div className="flex gap-3">
            <Skeleton className="h-12 flex-1 rounded-md" />
            <Skeleton className="h-12 flex-1 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Filter Chips Skeleton
 */
export const FilterChipsSkeleton: React.FC = () => {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: 3 + Math.floor(Math.random() * 4) }).map((_, index) => (
        <Skeleton 
          key={index}
          className="h-8 rounded-full"
          style={{ width: `${60 + Math.random() * 80}px` }}
        />
      ))}
      {/* Reset button skeleton */}
      <Skeleton className="h-8 w-20 rounded-md" />
    </div>
  )
}

export default FilterSkeleton