import { Card } from '@/components/ui/card'
import { AspectRatio } from '@/components/ui/aspect-ratio'
import { Button } from '@/components/ui/button'
import { LeaseScorePill } from '@/components/ui/LeaseScorePill'
import { ArrowLeft } from 'lucide-react'
import { useNavigationContext } from '@/hooks/useNavigationContext'
import type { CarListing } from '@/types'

interface MobileHeroImageProps {
  images: string[]
  processedImageDetail?: string
  resultCount?: number
  car: CarListing
  selectedLeaseScore?: number
}

const MobileHeroImage: React.FC<MobileHeroImageProps> = ({ 
  images, 
  processedImageDetail,
  resultCount,
  car,
  selectedLeaseScore
}) => {
  const { smartBack } = useNavigationContext()
  
  // Prioritize processed image, then first image from array
  const heroImage = processedImageDetail || images[0]
  
  if (!heroImage) {
    return (
      <div className="lg:hidden">
        <Card className="relative overflow-hidden bg-surface-alt">
          <AspectRatio ratio={4 / 3}>
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
        <AspectRatio ratio={4 / 3}>
          <div className="w-full h-full flex items-center justify-center px-4 pt-14 pb-8">
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
        <Button 
          onClick={smartBack}
          variant="secondary"
          size="icon"
          className="absolute top-4 left-4 z-30 bg-background/90 backdrop-blur shadow-lg hover:bg-background/95 h-12 w-12"
          aria-label={`Gå tilbage til resultater${resultCount ? ` (${resultCount})` : ''}`}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        {/* LeaseScore Pill - Top Right Corner */}
        {(selectedLeaseScore !== undefined || car.lease_score !== undefined) && car.retail_price && (
          <div className="absolute top-4 right-4 z-30">
            <LeaseScorePill 
              score={selectedLeaseScore ?? car.lease_score!}
              size="xs"
              className="shadow-lg backdrop-blur-sm"
            />
          </div>
        )}
      </Card>
      
      {/* Image disclaimer */}
      <div className="mt-2 px-4">
        <p className="text-xs text-muted-foreground text-center">
          Billede kun til illustration
        </p>
      </div>
    </div>
  )
}

export default MobileHeroImage