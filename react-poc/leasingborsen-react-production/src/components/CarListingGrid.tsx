import React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import ListingCard from '@/components/ListingCard'

interface CarListingGridProps {
  title: string
  description?: string
  cars?: any[]
  isLoading?: boolean
  error?: string | null
  ctaText?: string
  ctaLink?: string
  showCta?: boolean
  maxCards?: number
  className?: string
}

const CarListingGrid: React.FC<CarListingGridProps> = ({
  title,
  cars = [],
  isLoading = false,
  error = null,
  ctaText = "Se alle biler",
  ctaLink = "/listings",
  showCta = true,
  maxCards = 4,
  className = ""
}) => {
  // Limit the number of displayed cars
  const displayedCars = cars.slice(0, maxCards)
  
  return (
    /* =================================================
       CAR LISTING GRID COMPONENT - Reusable car display
       Dynamic title, description, and car data
    ================================================= */
    <section className={`space-y-6 ${className}`}>
      
      {/* =========================================
          SECTION HEADER - Left aligned title only
      ========================================= */}
      <div className="text-left">
        <h2 className="text-3xl font-bold text-foreground mb-4">
          {title}
        </h2>
      </div>

      {/* =========================================
          ERROR STATE - Display error message
      ========================================= */}
      {error && (
        <div className="bg-destructive text-destructive-foreground p-4 rounded-lg">
          Der opstod en fejl ved indlæsning af biler
        </div>
      )}

      {/* =========================================
          CAR GRID - Responsive: 1/2/4 columns
          Loading states, success states, empty states
      ========================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Loading State - Skeleton cards */}
        {isLoading ? (
          Array.from({ length: maxCards }).map((_, i) => (
            <ListingCard key={`loading-${i}`} loading={true} />
          ))
          
        /* Success State - Display car listings */
        ) : displayedCars.length > 0 ? (
          displayedCars.map((car) => (
            <ListingCard 
              key={car.listing_id || car.id} 
              car={{
                ...car,
                id: car.listing_id || car.id
              }} 
            />
          ))
          
        /* Empty State - No cars available */
        ) : (
          <div className="col-span-full text-center text-muted-foreground py-12">
            <p className="text-lg">Ingen biler tilgængelige</p>
            <p className="text-sm mt-2">Prøv at justere dine søgekriterier</p>
          </div>
        )}
      </div>

      {/* =========================================
          CALL-TO-ACTION BUTTON - Right aligned
          Only show if cars are available and CTA is enabled
      ========================================= */}
      {showCta && displayedCars.length > 0 && (
        <div className="text-right mt-8">
          <Link to={ctaLink}>
            <Button size="lg" className="font-semibold">
              {ctaText}
            </Button>
          </Link>
        </div>
      )}
    </section>
  )
}

export default CarListingGrid