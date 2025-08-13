import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useScrollStore } from '@/stores/scrollStore'
import { useRef, useEffect, useMemo } from 'react'
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver'
import { generateSrcSet } from '@/lib/imageUtils'

interface FullscreenHeroProps {
  images: string[]
  resultCount?: number
}

const FullscreenHero: React.FC<FullscreenHeroProps> = ({ 
  images, 
  resultCount 
}) => {
  const heroRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null as any)
  const location = useLocation()
  const scrollStore = useScrollStore()
  
  // Generate optimized image sources
  const heroImage = images[0]
  const srcSets = useMemo(() => {
    if (!heroImage) return { avif: '', webp: '', jpg: '' }
    return {
      avif: generateSrcSet(heroImage, 'avif'),
      webp: generateSrcSet(heroImage, 'webp'),
      jpg: generateSrcSet(heroImage, 'jpg')
    }
  }, [heroImage])
  
  // Track hero visibility for sticky header animation
  const heroEntry = useIntersectionObserver(sentinelRef, {
    threshold: 0.25,
    rootMargin: '0px'
  })
  
  // Update CSS class for animations
  useEffect(() => {
    const isScrolled = heroEntry && !heroEntry.isIntersecting
    document.documentElement.classList.toggle('hero-scrolled', isScrolled)
  }, [heroEntry?.isIntersecting])
  
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
        ref={heroRef}
        className="relative w-full lg:hidden mobile-fullscreen-hero"
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
            className="w-full h-full object-contain p-4"
            style={{
              opacity: 'var(--hero-opacity, 1)',
              transition: 'opacity 150ms ease-out'
            }}
          />
        </picture>
        
        {/* Gradient overlay for button contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent h-32" />
        
        {/* Floating Back Button with safe areas */}
        <Link 
          to="/listings" 
          onClick={handleBackClick}
          className="absolute z-30"
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
      
      {/* Sentinel for intersection observer - IN DOCUMENT FLOW (CRITICAL) */}
      <div 
        ref={sentinelRef} 
        className="h-0 w-full pointer-events-none"
        style={{ marginTop: '-25vh' }}
        aria-hidden="true"
      />
    </>
  )
}

export default FullscreenHero