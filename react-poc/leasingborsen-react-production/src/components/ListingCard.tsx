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
      <Card className="bg-card shadow-lg border border-border/50 rounded-xl overflow-hidden">
        {/* Image skeleton with enhanced shimmer */}
        <div className="relative rounded-t-xl overflow-hidden bg-gradient-to-br from-muted to-muted/70">
          <div className="w-full h-56 relative overflow-hidden">
            {/* Enhanced shimmer effect */}
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-background/40 to-transparent animate-shimmer"></div>
          </div>
        </div>
        
        <CardContent className="p-6">
          {/* Smart title & variant skeleton */}
          <div className="space-y-3 mb-4">
            {/* Car make and model (realistic lengths) */}
            <div className="flex items-center space-x-2">
              <div className="h-7 bg-muted rounded-lg w-20 animate-pulse"></div> {/* Make */}
              <div className="h-7 bg-muted rounded-lg w-28 animate-pulse" style={{animationDelay: '0.1s'}}></div> {/* Model */}
            </div>
            {/* Variant */}
            <div className="h-4 bg-muted rounded-lg w-36 animate-pulse" style={{animationDelay: '0.2s'}}></div>
          </div>

          {/* Smart price skeleton */}
          <div className="space-y-2 mb-4">
            {/* Price components */}
            <div className="flex items-baseline space-x-1">
              <div className="h-6 bg-muted rounded-lg w-20 animate-pulse" style={{animationDelay: '0.3s'}}></div> {/* Amount */}
              <div className="h-5 bg-muted rounded-lg w-12 animate-pulse" style={{animationDelay: '0.35s'}}></div> {/* /måned */}
            </div>
            {/* Secondary info */}
            <div className="h-3 bg-muted rounded-lg w-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
          </div>

          {/* Divider */}
          <Separator className="my-4" />

          {/* Smart specs skeleton */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-2 animate-pulse"
                  style={{animationDelay: `${0.5 + index * 0.1}s`}}
                >
                  <div className="w-4 h-4 bg-muted rounded-full"></div>
                  <div className={`h-3 bg-muted rounded-lg ${getRandomWidth()}`}></div>
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
        <div className="relative rounded-t-xl overflow-hidden bg-gradient-to-br from-muted to-muted/70">
          {/* Enhanced placeholder for missing images */}
          {!car.image ? (
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
              
              {/* High-resolution image */}
              <img
                ref={imageRef}
                src={car.image}
                alt={`${car.make} ${car.model} ${car.variant} - ${car.fuel_type} - ${formatPrice(car.monthly_price)}`}
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
                  onClick={retryImage} 
                  size="sm"
                  variant="outline"
                  disabled={imageRetryCount >= maxRetries}
                  className="text-xs"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  {imageRetryCount >= maxRetries ? 'Max forsøg' : 'Prøv igen'}
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
        <CardContent className="p-6">
          {/* Enhanced Title & Variant */}
          <div className="space-y-2 mb-4">
            <h3 className="text-xl font-bold text-foreground leading-tight group-hover:text-primary transition-colors duration-200">
              {car.make} {car.model}
            </h3>
            {car.variant && (
              <p className="text-sm text-muted-foreground font-medium">{car.variant}</p>
            )}
          </div>

          {/* Enhanced Price Display */}
          <div className="space-y-1 mb-5">
            <p className="text-2xl font-bold text-primary group-hover:text-primary/90 transition-colors duration-200">
              {formatPrice(car.monthly_price)}
            </p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{formatMileage(car.mileage_per_year)}</span>
              {car.first_payment && (
                <>
                  <span>•</span>
                  <span>Udbetaling: {car.first_payment.toLocaleString('da-DK')} kr</span>
                </>
              )}
            </div>
          </div>

          {/* Divider */}
          <Separator className="my-4" />

          {/* Enhanced Specs Grid */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200">
                <div className="w-4 h-4 flex items-center justify-center">
                  <Fuel className="w-4 h-4" />
                </div>
                <span className="font-medium">{car.fuel_type || '–'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200">
                <div className="w-4 h-4 flex items-center justify-center">
                  <Settings className="w-4 h-4" />
                </div>
                <span className="font-medium">{car.transmission || '–'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200">
                <div className="w-4 h-4 flex items-center justify-center">
                  <Car className="w-4 h-4" />
                </div>
                <span className="font-medium">{car.body_type || '–'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200">
                <div className="w-4 h-4 flex items-center justify-center">
                  <Gauge className="w-4 h-4" />
                </div>
                <span className="font-medium">{car.horsepower ? `${car.horsepower} hk` : '–'}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export default ListingCard