import React, { useState, useRef, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useListing } from '@/hooks/useListings'
import { useSimilarListings } from '@/hooks/useSimilarListings'
import { useLeaseCalculator } from '@/hooks/useLeaseCalculator'
import BaseLayout from '@/components/BaseLayout'
import Container from '@/components/Container'
import CarListingGrid from '@/components/CarListingGrid'
import MobilePriceBar from '@/components/MobilePriceBar'
import ListingHeader from '@/components/listing/ListingHeader'
import ListingTitle from '@/components/listing/ListingTitle'
import ListingImage from '@/components/listing/ListingImage'
import KeySpecs from '@/components/listing/KeySpecs'
import ListingSpecifications from '@/components/listing/ListingSpecifications'
import LeaseCalculatorCard from '@/components/listing/LeaseCalculatorCard'
import SellerModal from '@/components/SellerModal'
import FullscreenHero from '@/components/listing/FullscreenHero'
import CompactStickyHeader from '@/components/listing/CompactStickyHeader'
import { ErrorBoundary, CompactErrorFallback } from '@/components/ui/error-boundary'
import { useScrollRestoration } from '@/hooks/useScrollRestoration'
import { cn } from '@/lib/utils'
import type { CarListing } from '@/types'

const Listing: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { data: listingResponse, isLoading, error } = useListing(id || '')
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
    totalCost,
    bestScoreOption: _bestScoreOption,
    isCheapest,
    priceDifference,
    mileagePriceImpacts,
    periodPriceImpacts,
    upfrontPriceImpacts,
    setHoveredOption
  } = useLeaseCalculator(car)
  
  // Seller modal state
  const [sellerModalOpen, setSellerModalOpen] = useState(false)

  // Scroll restoration for back navigation (CRITICAL)
  useScrollRestoration('/listings')

  // Calculate result count (would come from actual search results)
  const resultCount = 37 // TODO: Get from search context

  // Seller data
  const seller = {
    name: 'Leasingselskab A/S',
    website: 'https://example.com',
    phone: '+45 12 34 56 78',
    email: 'kontakt@leasingselskab.dk',
    description: 'Professionel leasingudbyder med over 10 års erfaring'
  }

  if (isLoading) {
    return (
      <BaseLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Indlæser bildetaljer...</p>
          </div>
        </div>
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
            <Link to="/listings">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Tilbage til søgning
              </Button>
            </Link>
          </div>
        </div>
      </BaseLayout>
    )
  }


  return (
    <BaseLayout className="listing-page" showHeader={false}>
      {/* Mobile fullscreen hero (hidden on desktop via CSS) */}
      <FullscreenHero 
        images={car?.images || []} 
        processedImageDetail={car?.processed_image_detail}
        resultCount={resultCount}
      />
      
      {/* Mobile sticky header (hidden on desktop via CSS) */}
      <CompactStickyHeader 
        title={`${car?.make} ${car?.model}`}
        variant={car?.variant}
        resultCount={resultCount}
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-4 lg:mt-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 lg:space-y-6">
            {/* Desktop image (hidden on mobile) */}
            <div className="hidden lg:block">
              <ErrorBoundary fallback={CompactErrorFallback}>
                <ListingImage car={car} />
              </ErrorBoundary>
            </div>
            
            {/* Desktop Key Specs - Show below image on desktop only */}
            <div className="hidden lg:block">
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
            
            <ErrorBoundary fallback={CompactErrorFallback}>
              <ListingSpecifications car={car} />
            </ErrorBoundary>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Desktop Title - Show in sidebar on desktop only */}
            <div className="hidden lg:block">
              <ErrorBoundary fallback={CompactErrorFallback}>
                <ListingTitle car={car} />
              </ErrorBoundary>
            </div>
            
            {/* Lease Calculator Card */}
            <ErrorBoundary fallback={CompactErrorFallback}>
              <LeaseCalculatorCard
                selectedLease={selectedLease}
                selectedMileage={selectedMileage}
                selectedPeriod={selectedPeriod}
                selectedUpfront={selectedUpfront}
                availableMileages={availableMileages}
                availablePeriods={availablePeriods}
                availableUpfronts={availableUpfronts}
                onMileageChange={setSelectedMileage}
                onPeriodChange={setSelectedPeriod}
                onUpfrontChange={setSelectedUpfront}
                onResetToCheapest={resetToCheapest}
                onShowSeller={() => setSellerModalOpen(true)}
                isLoading={leaseLoading}
                error={leaseError}
                totalCost={totalCost}
                isCheapest={isCheapest}
                priceDifference={priceDifference}
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
          <div className="mt-16">
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

      {/* Enhanced mobile price bar with scroll lock */}
      {car && (
        <MobilePriceBar 
          car={car}
          selectedLease={selectedLease || null}
          onShowSeller={() => setSellerModalOpen(true)}
        />
      )}

      {/* Seller Modal */}
      <SellerModal
        isOpen={sellerModalOpen}
        onClose={() => setSellerModalOpen(false)}
        seller={seller}
        car={car}
      />
    </BaseLayout>
  )
}

export default Listing