import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useListing } from '@/hooks/useListings'
import { useSimilarListings } from '@/hooks/useSimilarListings'
import { useLeaseCalculator } from '@/hooks/useLeaseCalculator'
import BaseLayout from '@/components/BaseLayout'
import CarListingGrid from '@/components/CarListingGrid'
import MobilePriceOverlay from '@/components/MobilePriceOverlay'
import MobilePriceBar from '@/components/MobilePriceBar'
import ListingHeader from '@/components/listing/ListingHeader'
import ListingImage from '@/components/listing/ListingImage'
import ListingSpecifications from '@/components/listing/ListingSpecifications'
import LeaseCalculatorCard from '@/components/listing/LeaseCalculatorCard'
import SellerModal from '@/components/SellerModal'
import { ErrorBoundary, CompactErrorFallback } from '@/components/ui/error-boundary'
import type { CarListing } from '@/types'

const Listing: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { data: listingResponse, isLoading, error } = useListing(id || '')

  const car = listingResponse?.data as CarListing | undefined

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
    leaseOptions: _leaseOptions,
    setSelectedMileage,
    setSelectedPeriod,
    setSelectedUpfront,
    resetToCheapest,
    isLoading: leaseLoading,
    error: leaseError
  } = useLeaseCalculator(car)
  
  // Mobile price overlay state
  const [mobilePriceOpen, setMobilePriceOpen] = useState(false)
  
  // Seller modal state
  const [sellerModalOpen, setSellerModalOpen] = useState(false)

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
    <BaseLayout>
      <div className="max-w-7xl mx-auto px-6 py-8 pb-32 lg:pb-8">
        <ListingHeader car={car} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <ErrorBoundary fallback={CompactErrorFallback}>
              <ListingImage car={car} />
            </ErrorBoundary>
            <ErrorBoundary fallback={CompactErrorFallback}>
              <ListingSpecifications car={car} />
            </ErrorBoundary>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Lease Calculator Card - Hidden on mobile */}
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
              Listing ID: {car.listing_id}
            </p>
          </div>
        )}

        {/* Mobile Price Components */}
        {car && (
          <>
            {/* Mobile Sticky Price Bar */}
            <MobilePriceBar
              car={car}
              seller={seller}
              selectedLease={selectedLease}
              onEditPrice={() => setMobilePriceOpen(true)}
              onShowSeller={() => setSellerModalOpen(true)}
            />

            {/* Mobile Price Overlay */}
            <MobilePriceOverlay
              isOpen={mobilePriceOpen}
              onClose={() => setMobilePriceOpen(false)}
              car={car}
              selectedMileage={selectedMileage}
              selectedPeriod={selectedPeriod}
              selectedUpfront={selectedUpfront}
              selectedLease={selectedLease}
              availableMileages={availableMileages}
              availablePeriods={availablePeriods}
              availableUpfronts={availableUpfronts}
              onMileageChange={setSelectedMileage}
              onPeriodChange={setSelectedPeriod}
              onUpfrontChange={setSelectedUpfront}
              onResetToCheapest={resetToCheapest}
              onShowSeller={() => setSellerModalOpen(true)}
            />

            {/* Seller Modal */}
            <SellerModal
              isOpen={sellerModalOpen}
              onClose={() => setSellerModalOpen(false)}
              seller={seller}
              car={car}
            />
          </>
        )}
      </div>
    </BaseLayout>
  )
}

export default Listing