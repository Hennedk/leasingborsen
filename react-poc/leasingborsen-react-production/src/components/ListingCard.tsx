import React, { useMemo, useCallback } from 'react'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Fuel, 
  Settings, 
  Car, 
  Gauge, 
  AlertCircle, 
  RotateCcw, 
  Flag
} from 'lucide-react'
import { useImageLazyLoading } from '@/hooks/useImageLazyLoading'
import { useFilterTranslationFunctions } from '@/hooks/useFilterTranslations'
import { useNavigationContext } from '@/hooks/useNavigationContext'
import { LeaseScorePill } from '@/components/ui/LeaseScorePill'
import { calculateLeaseScore } from '@/hooks/useLeaseCalculator'
import type { CarListing } from '@/types'

interface ListingCardProps {
  car?: CarListing | null
  loading?: boolean
  currentPage?: number
}

const listingsRoute = getRouteApi('/listings')

const ListingCardComponent: React.FC<ListingCardProps> = ({ car, loading = false, currentPage = 1 }) => {
  // Try to get search params, fallback to empty object if not on listings route
  let searchParams = {}
  try {
    searchParams = listingsRoute.useSearch()
  } catch {
    // Not on listings route, use empty search params
    searchParams = {}
  }
  const { prepareListingNavigation } = useNavigationContext()
  const navigate = useNavigate()

  // Translation functions
  const { translateFuelType, translateTransmission, translateBodyType } = useFilterTranslationFunctions()

  // Image loading
  const {
    imageLoaded,
    imageError,
    imageRef,
    retryImage,
    retryCount,
    canRetry
  } = useImageLazyLoading()

  const formatPrice = useCallback((price?: number) => {
    if (!price) return '–'
    return `${price.toLocaleString('da-DK')} kr/md`
  }, [])

  // Derived data
  const displayMileage = useMemo(() => {
    if (!car?.mileage_per_year) return 'Ikke oplyst'
    return `${car.mileage_per_year.toLocaleString('da-DK')} km/år`
  }, [car?.mileage_per_year])

  const displayPrice = useMemo(() => {
    return formatPrice(car?.monthly_price)
  }, [car?.monthly_price, formatPrice])

  // Calculate lease score for the cheapest option (displayed price)
  const calculatedLeaseScore = useMemo(() => {
    if (!car?.retail_price || !car?.monthly_price || !car?.mileage_per_year || !car?.period_months) {
      return undefined
    }
    
    return calculateLeaseScore(
      car.monthly_price,
      car.retail_price,
      car.mileage_per_year,
      car.period_months
    )
  }, [car?.retail_price, car?.monthly_price, car?.mileage_per_year, car?.period_months])

  const handleCardClick = () => {
    if (!car) return
    
    // Prepare navigation with actual current scroll position
    prepareListingNavigation(window.scrollY, currentPage, new URLSearchParams(searchParams as any))
    preloadDetailImage()
    
    navigate({
      to: '/listing/$id',
      params: { id: car.listing_id || car.id! }
    })
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleCardClick()
    }
  }

  const preloadDetailImage = () => {
    if (!car?.processed_image_detail) return
    const img = new Image()
    img.src = car.processed_image_detail
  }

  // Loading skeleton
  if (loading) {
    return (
      <Card className="group relative overflow-hidden cursor-pointer bg-card border border-border/40">
        <CardContent className="p-0">
          {/* Image skeleton */}
          <div className="relative aspect-[4/3] bg-muted overflow-hidden">
            <Skeleton className="w-full h-full" />
          </div>
          
          {/* Content skeleton */}
          <div className="p-4 space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            
            <div className="grid grid-cols-3 gap-2 pt-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="text-center">
                  <Skeleton className="h-4 w-6 mx-auto mb-1" />
                  <Skeleton className="h-3 w-12 mx-auto" />
                </div>
              ))}
            </div>
            
            <Separator className="my-3" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!car) {
    return (
      <Card className="group relative overflow-hidden bg-muted/30 border border-dashed border-border/60">
        <CardContent className="p-6 text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Ingen bil data</p>
        </CardContent>
      </Card>
    )
  }

  // Main car data
  const carAltText = `${car.make} ${car.model} ${car.variant || ''}`.trim()
  
  return (
    <Card 
      className="group relative overflow-hidden cursor-pointer bg-card border border-border/40 hover:border-border/60 hover:bg-card/80 transition-all duration-200"
      onClick={handleCardClick}
      onKeyDown={onKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Se detaljer for ${carAltText}`}
    >
      <CardContent className="p-0">
        {/* Main image with overlay and report button */}
        <div className="relative aspect-[4/3] bg-muted overflow-hidden">
          {/* Car image */}
          {car.processed_image_grid ? (
            <img
              ref={imageRef}
              src={car.processed_image_grid}
              alt={carAltText}
              loading="lazy"
              className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-[1.02] ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              style={{
                transform: imageLoaded ? 'translateZ(0)' : 'translateZ(0) scale(1.05)',
                willChange: 'transform, opacity'
              }}
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <Car className="w-16 h-16 text-muted-foreground/40" />
            </div>
          )}

          {/* Error state with retry */}
          {imageError && (
            <div className="absolute inset-0 bg-muted flex flex-col items-center justify-center p-4 text-center">
              <AlertCircle className="w-8 h-8 text-muted-foreground/60 mb-2" />
              <p className="text-xs text-muted-foreground mb-2">Billede kunne ikke indlæses</p>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  retryImage()
                }}
                disabled={!canRetry}
                className="h-7 px-2 text-xs"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                {!canRetry ? 'Max forsøg' : `Prøv igen (${retryCount}/3)`}
              </Button>
            </div>
          )}

          {/* Report issue button */}
          {imageLoaded && !imageError && (
            <div className="absolute top-2 left-2 z-10">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    // Report issue functionality would go here
                  }}
                  className="h-7 px-2 text-xs bg-background/90 border border-border/60 shadow-lg hover:bg-background backdrop-blur-sm"
                >
                  <Flag className="w-3 h-3 mr-1" />
                  Rapportér
                </Button>
              </div>
            </div>
          )}
          
          {/* Lease Score Pill - positioned absolutely in top-right corner */}
          {calculatedLeaseScore && car.retail_price && (
            <LeaseScorePill 
              score={calculatedLeaseScore}
              size="xs"
              className="absolute top-3 right-3 z-10"
            />
          )}
          
          {/* Enhanced overlay gradient on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/0 via-transparent to-transparent group-hover:from-black/10 transition-all duration-300"></div>
        </div>
        
        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Car title */}
          <div className="space-y-1">
            <h3 className="font-semibold text-base leading-tight text-foreground line-clamp-2 group-hover:text-primary transition-colors duration-200">
              {car.make} {car.model}
            </h3>
            {car.variant && (
              <p className="text-sm text-muted-foreground line-clamp-1">
                {car.variant}
              </p>
            )}
          </div>
          
          {/* Key specs in a clean grid */}
          <div className="grid grid-cols-3 gap-3 py-2">
            {/* Fuel Type */}
            <div className="text-center">
              <Fuel className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground leading-tight">
                {translateFuelType(car.fuel_type)}
              </p>
            </div>
            
            {/* Transmission */}
            <div className="text-center">
              <Settings className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground leading-tight">
                {translateTransmission(car.transmission)}
              </p>
            </div>
            
            {/* Mileage */}
            <div className="text-center">
              <Gauge className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground leading-tight">
                {displayMileage}
              </p>
            </div>
          </div>
          
          <Separator className="my-3" />
          
          {/* Price and body type */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xl font-bold text-foreground leading-none">
                {displayPrice}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">
                {translateBodyType(car.body_type)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Memoized component for better performance
const ListingCard = React.memo(ListingCardComponent)

export default ListingCard