import React, { useState, useCallback } from 'react'
import { useListings } from '@/hooks/useListings'
import BaseLayout from '@/components/BaseLayout'
import HeroBanner from '@/components/HeroBanner'
import CarListingGrid from '@/components/CarListingGrid'
import PopularCategories from '@/components/PopularCategories'

const Home: React.FC = () => {
  const { data: listingsResponse, isLoading, error } = useListings({}, 4)
  const [navigationError, setNavigationError] = useState<string | null>(null)
  

  // Error handler for category navigation
  const handleNavigationError = useCallback((error: Error) => {
    console.error('Navigation error:', error)
    setNavigationError('Der opstod en fejl ved navigation. Prøv igen.')
    
    // Clear error after 5 seconds
    setTimeout(() => setNavigationError(null), 5000)
  }, [])

  return (
    /* =================================================
       HOME PAGE LAYOUT - Main landing page structure
       Uses BaseLayout with proper container management
    ================================================= */
    <BaseLayout>
      
      {/* =================
          HERO SECTION - Full width with integrated container
      ================= */}
      <HeroBanner />
      
      {/* =================
          MAIN CONTENT SECTIONS - Proper spacing and container usage
      ================= */}
      <div className="space-y-10 lg:space-y-12 py-10 lg:py-10">
        
        {/* =================
            POPULAR CATEGORIES - Consistent spacing
        ================= */}
        <PopularCategories 
          onNavigationError={handleNavigationError}
        />
        
        {/* =================
            LATEST CARS SECTION - Consistent container usage
        ================= */}
        <section className="bg-background">
          <div className="mx-auto w-full max-w-[1440px] px-6 md:px-12">
            <CarListingGrid
              title="Seneste biler"
              cars={listingsResponse?.data || []}
              isLoading={isLoading}
              error={error?.message || null}
              ctaText="Se alle biler"
              ctaLink="/listings"
              showCta={true}
              maxCards={4}
            />
          </div>
        </section>
        
      </div>

      {/* =================
          ERROR DISPLAY - User feedback for navigation errors
      ================= */}
      {navigationError && (
        <div className="fixed bottom-4 right-4 bg-destructive text-destructive-foreground p-4 rounded-lg shadow-lg z-50 max-w-sm">
          <p className="text-sm">{navigationError}</p>
        </div>
      )}

    </BaseLayout>
  )
}

export default Home