import React, { useState, useCallback } from 'react'
import { useListings } from '@/hooks/useListings'
import BaseLayout from '@/components/BaseLayout'
import HeroBanner from '@/components/HeroBanner'
import CarListingGrid from '@/components/CarListingGrid'
import PopularCategories from '@/components/PopularCategories'

const Home: React.FC = () => {
  const { data: listingsResponse, isLoading, error } = useListings({}, 20, 'lease_score_desc')
  const [navigationError, setNavigationError] = useState<string | null>(null)

  // Function to get diverse top deals (one per make/model combination)
  const getDiverseTopDeals = useCallback((listings: any[], maxCards = 5) => {
    if (!listings || listings.length === 0) return []

    const diverseDeals: any[] = []
    const seenMakeModels = new Set<string>()
    
    // Sort listings by lease score desc, then by monthly price asc for same scores
    const sortedListings = [...listings].sort((a, b) => {
      // Primary sort: lease score descending
      if (a.lease_score !== b.lease_score) {
        return (b.lease_score || 0) - (a.lease_score || 0)
      }
      // Secondary sort: monthly price ascending (cheaper first)
      return (a.monthly_price || 0) - (b.monthly_price || 0)
    })
    
    // First pass: get one listing per make/model (most diverse)
    for (const listing of sortedListings) {
      if (diverseDeals.length >= maxCards) break
      
      const makeModel = `${listing.make}-${listing.model}`
      if (!seenMakeModels.has(makeModel)) {
        diverseDeals.push(listing)
        seenMakeModels.add(makeModel)
      }
    }
    
    // Second pass: fill remaining slots with best remaining deals if needed
    if (diverseDeals.length < maxCards) {
      for (const listing of sortedListings) {
        if (diverseDeals.length >= maxCards) break
        if (!diverseDeals.find(d => d.listing_id === listing.listing_id)) {
          diverseDeals.push(listing)
        }
      }
    }
    
    return diverseDeals
  }, [])

  // Get diversified deals from the fetched data
  const diverseDeals = getDiverseTopDeals(listingsResponse?.data || [], 5)

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
            BEST DEALS SECTION - Cars with highest lease score (diversified)
        ================= */}
        <section className="bg-background">
          <div className="mx-auto w-full max-w-[1440px] px-6 md:px-12">
            <CarListingGrid
              title="Bedste tilbud lige nu"
              cars={diverseDeals}
              isLoading={isLoading}
              error={error?.message || null}
              ctaText="Se alle biler"
              ctaLink="/listings"
              showCta={true}
              maxCards={5}
            />
          </div>
        </section>
        
      </div>

      {/* =================
          ERROR DISPLAY - User feedback for navigation errors
      ================= */}
      {navigationError && (
        <div className="fixed bottom-4 right-4 bg-destructive text-destructive-foreground p-4 rounded-lg z-50 max-w-sm">
          <p className="text-sm">{navigationError}</p>
        </div>
      )}

    </BaseLayout>
  )
}

export default Home