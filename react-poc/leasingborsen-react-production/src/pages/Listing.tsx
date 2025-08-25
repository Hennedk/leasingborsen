import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useListingParams } from '@/hooks/useTypedRouter'
import { Button } from '@/components/ui/button'
import { ArrowLeft, SlidersHorizontal } from 'lucide-react'
import { useListing } from '@/hooks/useListings'
import { useSimilarListings } from '@/hooks/useSimilarListings'
import { useLeaseCalculator } from '@/hooks/useLeaseCalculator'
import { useListingPositioning } from '@/hooks/useListingPositioning'
import BaseLayout from '@/components/BaseLayout'
import Container from '@/components/Container'
import CarListingGrid from '@/components/CarListingGrid'
import MobilePriceDrawer from '@/components/MobilePriceDrawer'
import ListingHeader from '@/components/listing/ListingHeader'
import ListingTitle from '@/components/listing/ListingTitle'
import ListingImage from '@/components/listing/ListingImage'
import KeySpecs from '@/components/listing/KeySpecs'
import ListingSpecifications from '@/components/listing/ListingSpecifications'
import MobileDealOverview from '@/components/listing/MobileDealOverview'
import LeaseCalculatorCard from '@/components/listing/LeaseCalculatorCard'
import SellerModal from '@/components/SellerModal'
import MobileHeroImage from '@/components/listing/MobileHeroImage'
import { MobileListingDetailSkeleton } from '@/components/ListingsSkeleton'
import { ErrorBoundary, CompactErrorFallback } from '@/components/ui/error-boundary'
import { cn } from '@/lib/utils'
import type { CarListing } from '@/types'

const Listing: React.FC = () => {
  const { id } = useListingParams()
  const navigate = useNavigate()
  const { data: listingResponse, isLoading, error } = useListing(id || '')
  const { isPositioned } = useListingPositioning(id)
  const mobileTitleRef = useRef<HTMLDivElement>(null)

  const car = listingResponse?.data as CarListing | undefined

  // Track when mobile title is about to hit sticky header
  useEffect(() => {
    if (!mobileTitleRef.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show sticky header when title is about to go under where sticky header will be
        // The sticky header is ~56px (h-14), so we trigger when title is 56px from top
        const shouldShowHeader = !entry.isIntersecting
        document.documentElement.classList.toggle('hero-scrolled', shouldShowHeader)
      },
      {
        // rootMargin top value should match sticky header height
        rootMargin: '-56px 0px 0px 0px',
        threshold: 1.0
      }
    )

    observer.observe(mobileTitleRef.current)
    return () => observer.disconnect()
  }, [car]) // Re-run when car changes

  // Scroll to top is now handled by useListingPositioning hook

  // Fetch similar listings using enhanced multi-tier matching
  const { 
    similarCars,
    isLoading: similarLoading, 
    error: similarError
  } = useSimilarListings(car || null, 6)

  // Lease calculator hook
  const {
    selectedMileage,
    selectedPeriod,
    selectedUpfront,
    selectedLease,
    selectedLeaseScore,
    availableMileages,
    availablePeriods,
    availableUpfronts,
    leaseOptionsWithScores: _leaseOptionsWithScores,
    setSelectedMileage,
    setSelectedPeriod,
    setSelectedUpfront,
    resetToCheapest,
    selectBestScore: _selectBestScore,
    isLoading: leaseLoading,
    error: leaseError,
    bestScoreOption: _bestScoreOption,
    mileagePriceImpacts,
    periodPriceImpacts,
    upfrontPriceImpacts,
    setHoveredOption
  } = useLeaseCalculator(car)
  
  // Seller modal state
  const [sellerModalOpen, setSellerModalOpen] = useState(false)
  
  // Mobile price drawer state
  const [priceDrawerOpen, setPriceDrawerOpen] = useState(false)

  // Note: Scroll restoration moved to Listings.tsx where it belongs

  // Calculate result count (would come from actual search results)
  const resultCount = 37 // TODO: Get from search context

  // External URL for seller (could come from listing data or be configured)
  const externalUrl = 'https://example.com' // TODO: Get actual URL from seller/listing data

  if (isLoading) {
    return (
      <BaseLayout showHeader={false}>
        <MobileListingDetailSkeleton />
      </BaseLayout>
    )
  }

  if (error || !car) {
    return (
      <BaseLayout>
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive mb-4">Bil ikke fundet</h1>
            <p className="text-muted-foreground mb-6">
              Bilen du leder efter eksisterer ikke eller er ikke længere tilgængelig.
            </p>
            <Button onClick={() => {
              if (window.history.length > 1) {
                window.history.back(); // True back (POP)
              } else {
                navigate({ to: "/listings", replace: true });
              }
            }}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tilbage til søgning
            </Button>
          </div>
        </div>
      </BaseLayout>
    )
  }


  return (
    <BaseLayout 
      className="listing-page" 
      showHeader={true}
      style={{ visibility: isPositioned ? 'visible' : 'hidden' }}
    >
      {/* Mobile hero image with AspectRatio (hidden on desktop) */}
      <MobileHeroImage 
        images={car?.images || []} 
        processedImageDetail={car?.processed_image_detail}
        resultCount={resultCount}
        car={car}
        selectedLeaseScore={selectedLeaseScore}
      />
      
      
      {/* Main content with responsive padding */}
      <Container 
        className={cn(
          "pb-32 lg:pb-8",
          // Mobile: minimal padding after hero image
          "pt-2 lg:pt-8"
        )}
      >
        {/* Desktop header (hidden on mobile) */}
        <div className="hidden lg:block">
          <ListingHeader car={car} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[65fr_35fr] gap-10 mt-4 lg:mt-8">
          {/* Main Content */}
          <div className="space-y-4 lg:space-y-6">
            {/* Desktop image (hidden on mobile) */}
            <div className="hidden lg:block">
              <ErrorBoundary fallback={CompactErrorFallback}>
                <ListingImage car={car} selectedLeaseScore={selectedLeaseScore} />
              </ErrorBoundary>
            </div>
            
            {/* Desktop Key Specs - Show below image on desktop only */}
            <div className="hidden lg:block lg:my-8">
              <ErrorBoundary fallback={CompactErrorFallback}>
                <KeySpecs car={car} />
              </ErrorBoundary>
            </div>
            
            {/* Mobile Title - Show on mobile only */}
            <div ref={mobileTitleRef} className="lg:hidden">
              <ErrorBoundary fallback={CompactErrorFallback}>
                <ListingTitle car={car} />
              </ErrorBoundary>
            </div>
            
            {/* Mobile Key Specs - Show below title on mobile only */}
            <div className="lg:hidden">
              <ErrorBoundary fallback={CompactErrorFallback}>
                <KeySpecs car={car} />
              </ErrorBoundary>
            </div>
            
            {/* Mobile Deal Overview - Show below key specs on mobile only */}
            <ErrorBoundary fallback={CompactErrorFallback}>
              <MobileDealOverview
                selectedMileage={selectedMileage}
                selectedPeriod={selectedPeriod}
                selectedLease={selectedLease || null}
                availableMileages={availableMileages}
                availablePeriods={availablePeriods}
                availableUpfronts={availableUpfronts}
                onOpenPriceDrawer={() => setPriceDrawerOpen(true)}
              />
            </ErrorBoundary>
            
            <ErrorBoundary fallback={CompactErrorFallback}>
              <ListingSpecifications car={car} />
            </ErrorBoundary>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Lease Calculator Card */}
            <ErrorBoundary fallback={CompactErrorFallback}>
              <LeaseCalculatorCard
                car={car}
                selectedLease={selectedLease}
                selectedLeaseScore={selectedLeaseScore}
                selectedMileage={selectedMileage}
                selectedPeriod={selectedPeriod}
                selectedUpfront={selectedUpfront}
                availableMileages={availableMileages}
                availablePeriods={availablePeriods}
                availableUpfronts={availableUpfronts}
                onMileageChange={setSelectedMileage}
                onPeriodChange={setSelectedPeriod}
                onUpfrontChange={setSelectedUpfront}
                onShowSeller={() => setSellerModalOpen(true)}
                isLoading={leaseLoading}
                error={leaseError}
                mileagePriceImpacts={mileagePriceImpacts}
                periodPriceImpacts={periodPriceImpacts}
                upfrontPriceImpacts={upfrontPriceImpacts}
                onHoverOption={setHoveredOption}
              />
            </ErrorBoundary>
          </div>
        </div>

        {/* Similar Cars Section */}
        {car && (
          <div className="mt-8 lg:mt-16">
            <ErrorBoundary fallback={CompactErrorFallback}>
              <CarListingGrid
                title="Lignende annoncer"
                cars={similarCars}
                isLoading={similarLoading}
                error={similarError?.message || null}
                ctaText="Se alle biler"
                ctaLink="/listings"
                showCta={true}
                maxCards={6}
              />
            </ErrorBoundary>
          </div>
        )}

        {/* Listing ID Reference */}
        {car && (
          <div className="text-center py-4 mt-8">
            <p className="text-xs text-muted-foreground opacity-40">
              Listing ID: {car.listing_id || car.id || 'N/A'}
            </p>
          </div>
        )}

      </Container>

      {/* Mobile price bar footer */}
      {car && (
        <footer className="fixed bottom-0 inset-x-0 z-50 lg:hidden bg-background border-t">
          <div className="p-4 space-y-3" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}>
            <button 
              onClick={() => setPriceDrawerOpen(true)}
              className="w-full text-left group p-3 -m-3 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors"
              aria-label="Åbn prisindstillinger"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-1">
                  <p className="text-xl font-bold text-foreground leading-none">
                    {selectedLease?.monthly_price?.toLocaleString('da-DK')} kr./md.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground leading-relaxed pb-2">
                    <span className="font-medium">{selectedMileage?.toLocaleString('da-DK')} km/år</span>
                    <span className="text-muted-foreground/50">•</span>
                    <span className="font-medium">{selectedPeriod} mdr</span>
                    {selectedLease?.first_payment && (
                      <>
                        <span className="text-muted-foreground/50">•</span>
                        <span className="font-medium">Udb: {selectedLease.first_payment.toLocaleString('da-DK')} kr</span>
                      </>
                    )}
                  </div>
                </div>
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
              </div>
            </button>
            
            <Button 
              size="lg"
              onClick={() => setSellerModalOpen(true)}
              className="w-full h-12"
            >
              Gå til tilbud
            </Button>
          </div>
        </footer>
      )}

      {/* Enhanced mobile price drawer */}
      {car && (
        <MobilePriceDrawer 
          isOpen={priceDrawerOpen}
          onClose={() => setPriceDrawerOpen(false)}
          car={car}
          selectedMileage={selectedMileage}
          selectedPeriod={selectedPeriod}
          selectedUpfront={selectedUpfront}
          selectedLease={selectedLease}
          selectedLeaseScore={selectedLeaseScore}
          availableMileages={availableMileages}
          availablePeriods={availablePeriods}
          availableUpfronts={availableUpfronts}
          onMileageChange={setSelectedMileage}
          onPeriodChange={setSelectedPeriod}
          onUpfrontChange={setSelectedUpfront}
          onResetToCheapest={resetToCheapest}
          onSelectBestScore={_selectBestScore}
          onShowSeller={() => setSellerModalOpen(true)}
          mileagePriceImpacts={mileagePriceImpacts}
          periodPriceImpacts={periodPriceImpacts}
          upfrontPriceImpacts={upfrontPriceImpacts}
          onHoverOption={setHoveredOption}
          leaseOptionsWithScores={_leaseOptionsWithScores}
          bestScoreOption={_bestScoreOption}
        />
      )}

      {/* Seller Modal */}
      <SellerModal
        isOpen={sellerModalOpen}
        onClose={() => setSellerModalOpen(false)}
        car={car}
        externalUrl={externalUrl}
      />
    </BaseLayout>
  )
}

export default Listing