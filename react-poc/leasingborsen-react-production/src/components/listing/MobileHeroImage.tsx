import { Card } from '@/components/ui/card'
import { AspectRatio } from '@/components/ui/aspect-ratio'
import { Button } from '@/components/ui/button'
import { LeaseScorePill } from '@/components/ui/LeaseScorePill'
import { ArrowLeft } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useScrollStore } from '@/stores/scrollStore'
import type { CarListing } from '@/types'

interface MobileHeroImageProps {
  images: string[]
  processedImageDetail?: string
  resultCount?: number
  car: CarListing
}

const MobileHeroImage: React.FC<MobileHeroImageProps> = ({ 
  images, 
  processedImageDetail,
  resultCount,
  car
}) => {
  const location = useLocation()
  const scrollStore = useScrollStore()
  
  // Prioritize processed image, then first image from array
  const heroImage = processedImageDetail || images[0]
  
  // Save scroll position before navigating back
  const handleBackClick = () => {
    scrollStore.savePosition(location.pathname, window.scrollY)
  }
  
  if (!heroImage) {
    return (
      <div className="lg:hidden">
        <Card className="relative overflow-hidden bg-surface-alt">
          <AspectRatio ratio={16 / 9}>
            <div className="flex items-center justify-center w-full h-full bg-muted">
              <span className="text-muted-foreground">Ingen billede</span>
            </div>
          </AspectRatio>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="relative lg:hidden">
      <Card className="relative overflow-hidden bg-surface-alt border-0 rounded-none">
        <AspectRatio ratio={16 / 9}>
          <div className="w-full h-full flex items-center justify-center pt-16 pb-4 px-4">
            <img 
              src={heroImage}
              alt="Bil billede"
              loading="eager"
              fetchPriority="high"
              className="object-contain max-w-full max-h-full"
            />
          </div>
        </AspectRatio>
        
        {/* Gradient overlay for button contrast */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/20 via-transparent to-transparent pointer-events-none" />
        
        {/* Floating Back Button */}
        <Link 
          to="/listings" 
          onClick={handleBackClick}
          className="absolute top-4 left-4 z-30 floating-back-button"
        >
          <Button 
            variant="secondary"
            size="icon"
            className="bg-background/90 backdrop-blur shadow-lg hover:bg-background/95 h-12 w-12"
            aria-label={`Gå tilbage til resultater${resultCount ? ` (${resultCount})` : ''}`}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        
        {/* LeaseScore Pill - Top Right Corner */}
        {car.lease_score && car.retail_price && (
          <div className="absolute top-4 right-4 z-30">
            <LeaseScorePill 
              score={car.lease_score}
              size="sm"
              className="shadow-lg backdrop-blur-sm"
            />
          </div>
        )}
      </Card>
    </div>
  )
}

export default MobileHeroImage