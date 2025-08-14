import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useScrollStore } from '@/stores/scrollStore'
import { useMemo } from 'react'
import { generateSrcSet } from '@/lib/imageUtils'

interface FullscreenHeroProps {
  images: string[]
  processedImageDetail?: string
  resultCount?: number
}

const FullscreenHero: React.FC<FullscreenHeroProps> = ({ 
  images, 
  processedImageDetail,
  resultCount 
}) => {
  const location = useLocation()
  const scrollStore = useScrollStore()
  
  // Generate optimized image sources
  // Prioritize processed image, then first image from array
  const heroImage = processedImageDetail || images[0]
  const srcSets = useMemo(() => {
    if (!heroImage) return { avif: '', webp: '', jpg: '' }
    return {
      avif: generateSrcSet(heroImage, 'avif'),
      webp: generateSrcSet(heroImage, 'webp'),
      jpg: generateSrcSet(heroImage, 'jpg')
    }
  }, [heroImage])
  
  // Save scroll position before navigating back
  const handleBackClick = () => {
    scrollStore.savePosition(location.pathname, window.scrollY)
  }
  
  if (!heroImage) {
    return null // Or skeleton component
  }
  
  return (
    <>
      <div 
        className="relative w-full lg:hidden mobile-fullscreen-hero bg-gradient-to-br from-muted to-muted/70"
        style={{ 
          height: '40vh',  // Fixed moderate height
        }}
      >
        {/* Optimized Hero Image with Picture element */}
        <picture>
          <source 
            type="image/avif" 
            srcSet={srcSets.avif}
            sizes="100vw"
          />
          <source 
            type="image/webp" 
            srcSet={srcSets.webp}
            sizes="100vw"
          />
          <img 
            src={heroImage}
            srcSet={srcSets.jpg}
            sizes="100vw"
            alt="Bil billede"
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="w-full h-full object-contain px-4 pt-14 pb-8"
            style={{
              opacity: 'var(--hero-opacity, 1)',
              transition: 'opacity 150ms ease-out'
            }}
          />
        </picture>
        
        {/* Gradient overlay for button contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-transparent h-24 pointer-events-none" />
        
        {/* Floating Back Button with safe areas - hides when sticky header appears */}
        <Link 
          to="/listings" 
          onClick={handleBackClick}
          className="absolute z-30 floating-back-button transition-all duration-200"
          style={{
            top: 'max(1rem, env(safe-area-inset-top, 0px) + 0.5rem)',
            left: '1rem'
          }}
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
      </div>
    </>
  )
}

export default FullscreenHero