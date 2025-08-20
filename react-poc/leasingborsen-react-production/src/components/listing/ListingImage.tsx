import React, { useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Car } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LeaseScorePill } from '@/components/ui/LeaseScorePill'
import type { CarListing } from '@/types'

interface ListingImageProps {
  car: CarListing
  selectedLeaseScore?: number
}

const ListingImage = React.memo<ListingImageProps>(({ car, selectedLeaseScore }) => {
  const [imageLoading, setImageLoading] = useState(true)
  const [imageError, setImageError] = useState(false)
  
  // Prioritize processed image, then images array, then legacy image field
  const imageUrl = car.processed_image_detail || car.images?.[0] || car.image
  
  return (
    <div>
      <div className="relative overflow-hidden rounded-xl lg:mr-3 xl:mr-7 2xl:mr-10 bg-surface-alt">
        {imageUrl && !imageError ? (
          <>
            {imageLoading && (
              <Skeleton className="w-full aspect-[16/9] absolute inset-0" />
            )}
            <img 
              src={imageUrl} 
              alt={`${car.make} ${car.model}`}
              className={cn(
                "w-full aspect-[16/9] object-contain p-4 md:p-6 lg:p-8 transition-opacity duration-500 ease-out",
                imageLoading ? "opacity-0" : "opacity-100"
              )}
              loading="lazy"
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false)
                setImageError(true)
              }}
            />
          </>
        ) : (
          <div className="w-full aspect-[16/9] flex items-center justify-center bg-surface-alt">
            <div className="text-center text-muted-foreground">
              <Car className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>{imageError ? 'Billede kunne ikke indlæses' : 'Billede ikke tilgængeligt'}</p>
            </div>
          </div>
        )}
        
        {/* Lease Score Pill - positioned absolutely in top-right corner (mobile only) */}
        {(selectedLeaseScore || car.lease_score) && car.retail_price && (
          <LeaseScorePill 
            score={selectedLeaseScore || car.lease_score}
            size="sm"
            className="absolute top-4 right-4 z-10 md:hidden"
          />
        )}
      </div>
    
    {/* Image disclaimer */}
    <div className="mt-2 pr-4 md:pr-6 lg:pr-8">
      <p className="text-xs text-muted-foreground text-right md:text-center">
        Billede kun til illustration
      </p>
    </div>
    </div>
  )
})

export default ListingImage