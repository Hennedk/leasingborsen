import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Car } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CarListing } from '@/types'

interface ListingImageProps {
  car: CarListing
}

const ListingImage = React.memo<ListingImageProps>(({ car }) => {
  const [imageLoading, setImageLoading] = useState(true)
  const [imageError, setImageError] = useState(false)
  return (
    <Card className="bg-card shadow-lg border border-border/50 rounded-xl overflow-hidden">
      <div className="relative overflow-hidden bg-gradient-to-br from-muted to-muted/70">
        {car.image && !imageError ? (
          <>
            {imageLoading && (
              <Skeleton className="w-full h-96 absolute inset-0" />
            )}
            <img 
              src={car.image} 
              alt={`${car.make} ${car.model}`}
              className={cn(
                "w-full h-96 object-cover transition-opacity duration-500 ease-out",
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
          <div className="w-full h-96 bg-gradient-to-br from-muted to-muted/70 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Car className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>{imageError ? 'Billede kunne ikke indlæses' : 'Billede ikke tilgængeligt'}</p>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/0 via-transparent to-transparent"></div>
      </div>
    </Card>
  )
})

export default ListingImage