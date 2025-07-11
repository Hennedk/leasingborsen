import React, { useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
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
  Flag,
  Loader2
} from 'lucide-react'
import { useImageLazyLoading } from '@/hooks/useImageLazyLoading'
import type { CarListing } from '@/types'

interface ListingCardProps {
  car?: CarListing | null
  loading?: boolean
}

const ListingCardComponent: React.FC<ListingCardProps> = ({ car, loading = false }) => {
  
  // Optimized image loading with shared intersection observer
  const {
    imageRef,
    imageLoaded,
    imageError,
    retryImage,
    canRetry
  } = useImageLazyLoading(car?.processed_image_grid || car?.image, {
    threshold: 0.1,
    rootMargin: '200px',
    maxRetries: 3
  })
  
  // Interaction states
  const [showRipple, setShowRipple] = useState(false)
  const [navigating, setNavigating] = useState(false)
  const [isPressed, setIsPressed] = useState(false)
  
  // Memoized skeleton content for consistent rendering
  const skeletonWidths = useMemo(() => ['w-24', 'w-32', 'w-28', 'w-36', 'w-20', 'w-16'], [])
  const getRandomWidth = useCallback(() => 
    skeletonWidths[Math.floor(Math.random() * skeletonWidths.length)], 
    [skeletonWidths]
  )
  
  // Error recovery actions
  const handleRetryImage = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    retryImage()
  }, [retryImage])
  
  const reportIssue = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    console.error('Issue reported for car:', car?.id || car?.listing_id)
  }, [car?.id, car?.listing_id])
  
  // Optimized interaction handlers with useCallback
  const onCardClick = useCallback(() => {
    // Immediate visual feedback
    setShowRipple(true)
    setIsPressed(true)
    
    // Clear ripple after animation
    const rippleTimer = setTimeout(() => {
      setShowRipple(false)
      setIsPressed(false)
    }, 400)
    
    // Show loading if navigation is slow
    const navigationTimer = setTimeout(() => {
      setNavigating(true)
    }, 150)
    
    // Cleanup function
    return () => {
      clearTimeout(rippleTimer)
      clearTimeout(navigationTimer)
      setNavigating(false)
    }
  }, [])
  
  // Memoized utility functions for better performance
  const formatPrice = useCallback((price?: number) => {
    return price ? `${price.toLocaleString('da-DK')} kr/måned` : 'Pris ikke tilgængelig'
  }, [])
  
  const formatMileage = useCallback((mileage?: number) => {
    return mileage ? `${mileage.toLocaleString('da-DK')} km/år` : 'Km ikke angivet'
  }, [])
  
  // Memoized computed values
  const displayPrice = useMemo(() => formatPrice(car?.monthly_price), [car?.monthly_price, formatPrice])
  const displayMileage = useMemo(() => formatMileage(car?.mileage_per_year), [car?.mileage_per_year, formatMileage])
  const carAltText = useMemo(() => 
    `${car?.make} ${car?.model} ${car?.variant} - ${car?.fuel_type} - ${displayPrice}`,
    [car?.make, car?.model, car?.variant, car?.fuel_type, displayPrice]
  )
  
  // Enhanced Skeleton State with Realistic Content Structure
  if (loading) {
    return (
      <Card className="bg-card shadow-lg border border-border/50 rounded-xl overflow-hidden">
        {/* Image skeleton with enhanced shimmer */}
        <div className="relative overflow-hidden">
          <Skeleton className="w-full h-56" />
        </div>
        
        <CardContent className="p-4 pt-2">
          {/* Smart title & variant skeleton */}
          <div className="space-y-3 mb-4">
            {/* Car make and model (realistic lengths) */}
            <div className="flex items-center space-x-2">
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-7 w-28" />
            </div>
            {/* Variant */}
            <Skeleton className="h-4 w-36" />
          </div>

          {/* Smart price skeleton */}
          <div className="space-y-2 mb-4">
            {/* Price components */}
            <div className="flex items-baseline space-x-1">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-5 w-12" />
            </div>
            {/* Secondary info */}
            <Skeleton className="h-3 w-full" />
          </div>

          {/* Divider */}
          <Separator className="my-4" />

          {/* Smart specs skeleton */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`skeleton-spec-${car?.listing_id || 'loading'}-${index}`} className="flex items-center gap-2">
                  <Skeleton className="w-4 h-4 rounded-full" />
                  <Skeleton className={`h-3 ${getRandomWidth()}`} />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Enhanced Real Content State
  if (!car || (!car.id && !car.listing_id)) {
    return null
  }

  return (
    <Link
      to={`/listing/${car.id || car.listing_id}`}
      className="block group no-underline relative"
      onClick={onCardClick}
    >
      {/* Click ripple effect */}
      {showRipple && (
        <div 
          className="absolute inset-0 bg-primary/10 rounded-lg animate-ping z-20"
          style={{animationDuration: '0.4s', animationIterationCount: 1}}
        />
      )}
      
      {/* Loading overlay for slow navigation */}
      {navigating && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg z-30">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {/* Enhanced card with improved shadcn/ui styling */}
      <Card 
        className={`bg-card shadow-lg border border-border/50 hover:shadow-xl hover:border-primary/30 hover:-translate-y-1 transition-all duration-300 rounded-xl overflow-hidden ${
          isPressed ? 'scale-95 shadow-md translate-y-0' : ''
        }`}
      >
        {/* Progressive Image Loading with Enhanced Error States */}
        <div className="relative overflow-hidden bg-gradient-to-br from-muted to-muted/70">
          {/* Enhanced placeholder for missing images */}
          {!car.image && !car.processed_image_grid ? (
            <div className="bg-gradient-to-br from-muted to-muted/70 aspect-[4/3] flex items-center justify-center text-muted-foreground w-full h-56">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 mx-auto bg-muted-foreground/10 rounded-full flex items-center justify-center">
                  <Car className="w-6 h-6 opacity-50" />
                </div>
                <span className="text-sm font-medium">Billede mangler</span>
              </div>
            </div>
          ) : !imageError ? (
            <>
              {/* Blurred thumbnail placeholder */}
              {car.thumbnail_base64 && !imageLoaded && (
                <div className="absolute inset-0 z-10">
                  <img 
                    src={car.thumbnail_base64} 
                    className={`w-full h-56 object-cover blur-sm scale-105 transition-opacity duration-300 ${
                      imageLoaded ? 'opacity-0' : ''
                    }`}
                    alt={`${car.make} ${car.model} thumbnail`}
                  />
                </div>
              )}
              
              {/* Gradient placeholder if no thumbnail */}
              {!car.thumbnail_base64 && !imageLoaded && (
                <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/70 animate-pulse z-10" />
              )}
              
              {/* High-resolution image - prefer processed grid image */}
              <img
                ref={imageRef}
                src={car.processed_image_grid || car.image}
                alt={carAltText}
                className={`w-full h-56 object-cover transition-opacity duration-500 ease-out ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                loading="lazy"
              />
            </>
          ) : (
            /* Enhanced error state with recovery actions */
            <div className="bg-gradient-to-br from-muted to-muted/70 h-56 flex flex-col items-center justify-center p-6">
              <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-3">
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
              <p className="text-sm text-center mb-4 text-muted-foreground font-medium">
                Billedet kunne ikke indlæses
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={handleRetryImage} 
                  size="sm"
                  variant="outline"
                  disabled={!canRetry}
                  className="text-xs"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  {!canRetry ? 'Max forsøg' : 'Prøv igen'}
                </Button>
                <Button 
                  onClick={reportIssue} 
                  size="sm"
                  variant="ghost"
                  className="text-xs"
                >
                  <Flag className="w-3 h-3 mr-1" />
                  Rapportér
                </Button>
              </div>
            </div>
          )}
          
          {/* Enhanced overlay gradient on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/0 via-transparent to-transparent group-hover:from-black/10 transition-all duration-300"></div>
        </div>

        {/* Enhanced Card Body Content */}
        <CardContent className="p-5">
          {/* Enhanced Title & Variant */}
          <div className="space-y-0 mb-4">
            <h3 className="text-xl font-bold text-foreground leading-tight group-hover:text-primary transition-colors duration-200">
              {car.make} {car.model}
            </h3>
            {car.variant && (
              <p className="text-base text-muted-foreground font-normal leading-relaxed">{car.variant}</p>
            )}
          </div>

          {/* Enhanced Specs Grid */}
          <div className="mb-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div className="flex items-center gap-2.5 text-sm text-muted-foreground/80 group-hover:text-foreground transition-colors duration-200">
                <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                  <Fuel className="w-4 h-4" />
                </div>
                <span className="font-normal truncate">{car.fuel_type || '–'}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-muted-foreground/80 group-hover:text-foreground transition-colors duration-200">
                <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                  <Settings className="w-4 h-4" />
                </div>
                <span className="font-normal truncate">{car.transmission || '–'}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-muted-foreground/80 group-hover:text-foreground transition-colors duration-200">
                <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                  <Car className="w-4 h-4" />
                </div>
                <span className="font-normal truncate">{car.body_type || '–'}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-muted-foreground/80 group-hover:text-foreground transition-colors duration-200">
                <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                  <Gauge className="w-4 h-4" />
                </div>
                <span className="font-normal truncate">{car.horsepower ? `${car.horsepower} hk` : '–'}</span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <Separator className="my-5" />

          {/* Enhanced Price Display */}
          <div className="space-y-2">
            <p className="text-2xl font-bold text-primary group-hover:text-primary/90 transition-colors duration-200 leading-none">
              {displayPrice}
            </p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground leading-relaxed">
              <span className="font-medium">{displayMileage}</span>
              {car.first_payment && (
                <>
                  <span className="text-muted-foreground/50">•</span>
                  <span className="font-medium">Udbetaling: {car.first_payment.toLocaleString('da-DK')} kr</span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

// Memoized component for better performance
const ListingCard = React.memo(ListingCardComponent)

export default ListingCard