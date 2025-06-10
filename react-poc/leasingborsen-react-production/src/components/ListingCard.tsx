import React, { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
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

interface CarListing {
  listing_id?: string
  id?: string
  make: string
  model: string
  variant?: string
  monthly_price?: number
  mileage_per_year?: number
  first_payment?: number
  fuel_type?: string
  transmission?: string
  body_type?: string
  horsepower?: number
  image?: string
  thumbnail_base64?: string
}

interface ListingCardProps {
  car?: CarListing | null
  loading?: boolean
}

const ListingCard: React.FC<ListingCardProps> = ({ car, loading = false }) => {
  
  // Image loading states
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const imageRef = useRef<HTMLImageElement>(null)
  
  // Interaction states
  const [showRipple, setShowRipple] = useState(false)
  const [navigating, setNavigating] = useState(false)
  const [isPressed, setIsPressed] = useState(false)
  
  // Error recovery
  const [imageRetryCount, setImageRetryCount] = useState(0)
  const maxRetries = 3
  
  // Smart skeleton content
  const skeletonWidths = ['w-24', 'w-32', 'w-28', 'w-36', 'w-20', 'w-16']
  const getRandomWidth = () => skeletonWidths[Math.floor(Math.random() * skeletonWidths.length)]
  
  // Progressive image loading setup
  useEffect(() => {
    if (!loading && car && imageRef.current) {
      setupImageLoading()
    }
  }, [loading, car])
  
  const setupImageLoading = () => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          loadImage()
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.1 })
    
    if (imageRef.current) {
      observer.observe(imageRef.current)
    }
  }
  
  const loadImage = () => {
    if (!car?.image) return
    
    const img = new Image()
    img.onload = () => {
      setImageLoaded(true)
      setImageError(false)
    }
    img.onerror = () => {
      setImageError(true)
      setImageLoaded(false)
    }
    img.src = car.image
  }
  
  // Error recovery actions
  const retryImage = (e: React.MouseEvent) => {
    e.preventDefault()
    if (imageRetryCount < maxRetries) {
      setImageRetryCount(prev => prev + 1)
      setImageError(false)
      loadImage()
    }
  }
  
  const reportIssue = (e: React.MouseEvent) => {
    e.preventDefault()
    console.log('Issue reported for car:', car?.id || car?.listing_id)
  }
  
  // Interaction handlers
  const onCardClick = async () => {
    // Immediate visual feedback
    setShowRipple(true)
    setIsPressed(true)
    
    // Clear ripple after animation
    setTimeout(() => {
      setShowRipple(false)
      setIsPressed(false)
    }, 400)
    
    // Show loading if navigation is slow
    const navigationTimer = setTimeout(() => {
      setNavigating(true)
    }, 150)
    
    clearTimeout(navigationTimer)
    setNavigating(false)
  }
  
  // Utility functions
  const formatPrice = (price?: number) => {
    return price ? `${price.toLocaleString('da-DK')} kr/måned` : 'Pris ikke tilgængelig'
  }
  
  const formatMileage = (mileage?: number) => {
    return mileage ? `${mileage.toLocaleString('da-DK')} km/år` : 'Km ikke angivet'
  }
  
  // Enhanced Skeleton State with Realistic Content Structure
  if (loading) {
    return (
      <Card className="bg-card shadow-md border rounded-lg overflow-hidden">
        {/* Image skeleton with enhanced shimmer */}
        <div className="relative rounded-t-lg overflow-hidden bg-muted">
          <div className="w-full h-52 bg-muted relative overflow-hidden">
            {/* Enhanced shimmer effect */}
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-background/30 to-transparent animate-shimmer"></div>
          </div>
        </div>
        
        <CardContent className="p-5">
          {/* Smart title & variant skeleton */}
          <div className="pb-2">
            {/* Car make and model (realistic lengths) */}
            <div className="flex items-center space-x-2 mb-2">
              <div className="h-6 bg-muted rounded w-20 animate-pulse"></div> {/* Make */}
              <div className="h-6 bg-muted rounded w-28 animate-pulse" style={{animationDelay: '0.1s'}}></div> {/* Model */}
            </div>
            {/* Variant */}
            <div className="h-4 bg-muted rounded w-36 animate-pulse" style={{animationDelay: '0.2s'}}></div>
          </div>

          {/* Smart price skeleton */}
          <div className="py-2">
            {/* Price components */}
            <div className="flex items-baseline space-x-1 mb-2">
              <div className="h-5 bg-muted rounded w-16 animate-pulse" style={{animationDelay: '0.3s'}}></div> {/* Amount */}
              <div className="h-4 bg-muted rounded w-8 animate-pulse" style={{animationDelay: '0.35s'}}></div> {/* kr */}
              <div className="h-4 bg-muted rounded w-12 animate-pulse" style={{animationDelay: '0.4s'}}></div> {/* /måned */}
            </div>
            {/* Secondary info */}
            <div className="h-3 bg-muted rounded w-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
          </div>

          {/* Divider */}
          <Separator className="my-3" />

          {/* Smart specs skeleton */}
          <div className="pt-2">
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              {Array.from({ length: 4 }).map((_, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-2 animate-pulse"
                  style={{animationDelay: `${0.6 + index * 0.1}s`}}
                >
                  <div className="w-4 h-4 bg-muted rounded"></div>
                  <div className={`h-3 bg-muted rounded ${getRandomWidth()}`}></div>
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

      {/* Enhanced card with original hover effects */}
      <Card 
        className={`bg-card shadow-md border hover:shadow-xl hover:border-primary/20 transition-all duration-300 rounded-lg overflow-hidden ${
          isPressed ? 'scale-95 shadow-sm' : ''
        }`}
      >
        {/* Progressive Image Loading with Enhanced Error States */}
        <div className="relative rounded-t-lg overflow-hidden bg-muted">
          {/* Enhanced placeholder for missing images */}
          {!car.image ? (
            <div className="bg-muted aspect-video flex items-center justify-center text-muted-foreground w-full h-52">
              <div className="text-center">
                <Car className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <span className="text-sm">Billede mangler</span>
              </div>
            </div>
          ) : !imageError ? (
            <>
              {/* Blurred thumbnail placeholder */}
              {car.thumbnail_base64 && !imageLoaded && (
                <div className="absolute inset-0 z-10">
                  <img 
                    src={car.thumbnail_base64} 
                    className={`w-full h-52 object-cover blur-sm scale-105 transition-opacity duration-300 ${
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
              
              {/* High-resolution image */}
              <img
                ref={imageRef}
                src={car.image}
                alt={`${car.make} ${car.model} ${car.variant} - ${car.fuel_type} - ${formatPrice(car.monthly_price)}`}
                className={`w-full h-52 object-cover transition-opacity duration-500 ease-out ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                loading="lazy"
              />
            </>
          ) : (
            /* Enhanced error state with recovery actions */
            <div className="bg-muted h-52 flex flex-col items-center justify-center p-4">
              <AlertCircle className="w-8 h-8 text-destructive mb-2" />
              <p className="text-sm text-center mb-3 text-muted-foreground">
                Billedet kunne ikke indlæses
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={retryImage} 
                  size="sm"
                  variant="outline"
                  disabled={imageRetryCount >= maxRetries}
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  {imageRetryCount >= maxRetries ? 'Max forsøg' : 'Prøv igen'}
                </Button>
                <Button 
                  onClick={reportIssue} 
                  size="sm"
                  variant="ghost"
                >
                  <Flag className="w-4 h-4 mr-1" />
                  Rapportér
                </Button>
              </div>
            </div>
          )}
          
          {/* Original overlay gradient on hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all duration-300"></div>
        </div>

        {/* Enhanced Card Body Content */}
        <CardContent className="p-5">
          {/* Enhanced Title & Variant */}
          <div className="pb-2">
            <h3 className="text-lg font-bold text-primary leading-snug group-hover:text-primary/90 transition-colors duration-200">
              {car.make} {car.model}
            </h3>
            {car.variant && (
              <p className="text-sm text-muted-foreground mt-1">{car.variant}</p>
            )}
          </div>

          {/* Enhanced Price with original hover */}
          <div className="py-2">
            <p className="text-lg font-semibold text-foreground group-hover:text-primary/90 transition-colors duration-200">
              {formatPrice(car.monthly_price)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatMileage(car.mileage_per_year)}
              {car.first_payment && (
                <>
                  {' • '}
                  Udbetaling: {car.first_payment.toLocaleString('da-DK')} kr
                </>
              )}
            </p>
          </div>

          {/* Divider */}
          <Separator className="my-3" />

          {/* Enhanced Specs with original hover effects */}
          <div className="pt-2">
            <div className="grid grid-cols-2 gap-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 group-hover:text-foreground transition-colors duration-200">
                <Fuel className="w-4 h-4" /> 
                {car.fuel_type || '–'}
              </div>
              <div className="flex items-center gap-2 group-hover:text-foreground transition-colors duration-200">
                <Settings className="w-4 h-4" /> 
                {car.transmission || '–'}
              </div>
              <div className="flex items-center gap-2 group-hover:text-foreground transition-colors duration-200">
                <Car className="w-4 h-4" /> 
                {car.body_type || '–'}
              </div>
              <div className="flex items-center gap-2 group-hover:text-foreground transition-colors duration-200">
                <Gauge className="w-4 h-4" /> 
                {car.horsepower ? `${car.horsepower} hk` : '–'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export default ListingCard