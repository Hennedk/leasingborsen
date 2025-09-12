import React from 'react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import ListingCard from '@/components/ListingCard'

type Container = 'results_grid' | 'similar_grid' | 'carousel' | 'home_grid' | 'home_carousel'
type OriginSurface = 'listings' | 'detail' | 'home'
type OriginType = 'grid' | 'module' | 'carousel'
type OriginName = 'results_grid' | 'similar_cars' | 'home_featured' | 'home_carousel' | 'home_grid'

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
  // Optional: carry current lease configuration to ListingCard navigation
  leaseConfig?: {
    selectedMileage?: number | null
    selectedTerm?: number | null
    selectedDeposit?: number | null
  }
  // Optional analytics context to forward to ListingCard
  container?: Container
  origin?: {
    surface: OriginSurface
    type: OriginType
    name: OriginName
    module_id?: string
    instance_id?: string
  }
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
  className = "",
  leaseConfig,
  container,
  origin
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
          SECTION HEADER - Left aligned title with desktop CTA button
      ========================================= */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-xl md:text-2xl font-semibold text-foreground">
          {title}
        </h2>
        {/* Desktop CTA Button - Only show on desktop */}
        {showCta && displayedCars.length > 0 && (
          <div className="hidden md:block">
            <Link to={ctaLink}>
              <Button variant="ghost" size="lg" className="font-medium text-muted-foreground hover:text-foreground py-2">
                {ctaText} →
              </Button>
            </Link>
          </div>
        )}
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
          CAR CAROUSEL - Horizontal scroll with partial visibility
          Loading states, success states, empty states
      ========================================= */}
      <div className="relative">
        {/* Horizontal Scrollable Container */}
        <div className="flex gap-4 lg:gap-6 overflow-x-auto pb-4 scroll-smooth scrollbar-hide [scroll-snap-type:x_mandatory] [scroll-padding:0_1.5rem]">
          {/* Loading State - Skeleton cards */}
          {isLoading ? (
            Array.from({ length: maxCards }).map((_, i) => (
              <div 
                key={`loading-${i}`}
                className="flex-none w-[calc(85%-16px)] sm:w-[calc(50%-16px)] lg:w-[calc(23%-18px)] snap-start"
              >
                <ListingCard loading={true} />
              </div>
            ))
            
          /* Success State - Display car listings */
          ) : displayedCars.length > 0 ? (
            displayedCars.map((car, idx) => (
              <div 
                key={car.listing_id || car.id}
                className="flex-none w-[calc(85%-16px)] sm:w-[calc(50%-16px)] lg:w-[calc(23%-18px)] snap-start"
              >
                <ListingCard 
                  car={{
                    ...car,
                    id: car.listing_id || car.id
                  }} 
                  position={idx + 1}
                  initialLeaseConfig={{
                    selectedMileage: leaseConfig?.selectedMileage ?? undefined,
                    selectedTerm: leaseConfig?.selectedTerm ?? undefined,
                    selectedDeposit: leaseConfig?.selectedDeposit ?? undefined
                  }}
                  container={container}
                  origin={origin}
                />
              </div>
            ))
            
          /* Empty State - No cars available */
          ) : (
            <div className="flex-none w-full text-center text-muted-foreground py-12">
              <p className="text-lg">Ingen biler tilgængelige</p>
              <p className="text-sm mt-2">Prøv at justere dine søgekriterier</p>
            </div>
          )}
        </div>
        
        {/* Fade Out Effect for Peekaboo */}
        <div className="absolute top-0 right-0 h-full w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
      </div>

      {/* =========================================
          MOBILE CALL-TO-ACTION BUTTON - Full width on mobile only
          Desktop CTA is shown in header section above
      ========================================= */}
      {showCta && displayedCars.length > 0 && (
        <div className="text-center mt-3 md:hidden">
          <Link to={ctaLink}>
            <Button size="lg" className="font-semibold w-full">
              {ctaText}
            </Button>
          </Link>
        </div>
      )}
    </section>
  )
}

export default CarListingGrid
