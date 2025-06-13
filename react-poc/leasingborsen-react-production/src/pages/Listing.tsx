import React, { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { 
  ArrowLeft, 
  Loader2,
  ExternalLink,
  RotateCcw
} from 'lucide-react'
import { useListing, useListings } from '@/hooks/useListings'
import { useLeaseCalculator } from '@/hooks/useLeaseCalculator'
import BaseLayout from '@/components/BaseLayout'
import CarListingGrid from '@/components/CarListingGrid'
import MobilePriceOverlay from '@/components/MobilePriceOverlay'
import MobilePriceBar from '@/components/MobilePriceBar'
import ListingHeader from '@/components/listing/ListingHeader'
import ListingImage from '@/components/listing/ListingImage'
import ListingSpecifications from '@/components/listing/ListingSpecifications'
import type { CarListing } from '@/types'

const Listing: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { data: listingResponse, isLoading, error } = useListing(id || '')

  const car = listingResponse?.data as CarListing | undefined

  // Fetch similar listings based on the current car
  const similarFilters = useMemo(() => {
    if (!car) return {}
    return {
      makes: [car.make],
      body_type: car.body_type ? [car.body_type] : [],
      price_min: Math.floor((car.monthly_price || 0) * 0.75),
      price_max: Math.ceil((car.monthly_price || 0) * 1.25)
    }
  }, [car?.make, car?.body_type, car?.monthly_price])

  const { 
    data: similarListingsResponse, 
    isLoading: similarLoading, 
    error: similarError 
  } = useListings(similarFilters, 6, '') // Get 6 similar cars

  // Filter out the current car from similar listings
  const similarCars = useMemo(() => {
    const cars = similarListingsResponse?.data || []
    return cars.filter(similarCar => similarCar.listing_id !== id)
  }, [similarListingsResponse?.data, id])

  // Lease calculator hook
  const {
    selectedMileage,
    selectedPeriod,
    selectedUpfront,
    selectedLease,
    availableMileages,
    availablePeriods,
    availableUpfronts,
    leaseOptions,
    setSelectedMileage,
    setSelectedPeriod,
    setSelectedUpfront,
    resetToCheapest
  } = useLeaseCalculator(car)
  
  // Mobile price overlay state
  const [mobilePriceOpen, setMobilePriceOpen] = React.useState(false)

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
            <ListingImage car={car} />
            <ListingSpecifications car={car} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Lease Calculator Card - Hidden on mobile */}
            <Card className="hidden lg:block bg-card shadow-lg border border-border/50 rounded-xl overflow-hidden sticky top-[90px]">
              <CardContent className="p-5 space-y-4">
                {/* Monthly Price Display */}
                <div>
                  <h3 className="text-3xl font-bold text-primary mb-2">
                    {selectedLease?.monthly_price?.toLocaleString('da-DK') ?? '–'} kr/md
                  </h3>
                </div>

                {/* Reset Button */}
                <div className="mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetToCheapest}
                    className="h-auto px-2 py-1 hover:bg-muted"
                    title="Nulstil til laveste pris"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Nulstil til laveste pris
                  </Button>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  {/* Mileage Selection */}
                  <div>
                    <Label className="text-sm font-semibold text-primary">
                      Årligt km-forbrug
                    </Label>
                    <Select 
                      value={selectedMileage?.toString() || ''} 
                      onValueChange={(value) => setSelectedMileage(parseInt(value))}
                    >
                      <SelectTrigger className="w-full border-primary/30 focus:border-primary">
                        <SelectValue placeholder="Vælg km-forbrug" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableMileages.map((mileage) => (
                          <SelectItem key={mileage} value={mileage.toString()}>
                            {mileage.toLocaleString('da-DK')} km/år
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Period Selection */}
                  <div>
                    <Label className="text-sm font-semibold text-primary">
                      Leasingperiode
                    </Label>
                    <Select 
                      value={selectedPeriod?.toString() || ''} 
                      onValueChange={(value) => setSelectedPeriod(parseInt(value))}
                    >
                      <SelectTrigger className="w-full border-primary/30 focus:border-primary">
                        <SelectValue placeholder="Vælg periode" />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePeriods.map((period) => (
                          <SelectItem key={period} value={period.toString()}>
                            {period} måneder
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Upfront Payment Selection */}
                  <div>
                    <Label className="text-sm font-semibold text-primary">
                      Udbetaling
                    </Label>
                    <Select 
                      value={selectedUpfront?.toString() || ''} 
                      onValueChange={(value) => setSelectedUpfront(parseInt(value))}
                    >
                      <SelectTrigger className="w-full border-primary/30 focus:border-primary">
                        <SelectValue placeholder="Vælg udbetaling" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUpfronts.map((upfront) => (
                          <SelectItem key={upfront} value={upfront.toString()}>
                            {upfront.toLocaleString('da-DK')} kr
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Primary CTA Button */}
                <div className="pt-4">
                  <Button 
                    className="w-full gap-2" 
                    size="lg"
                    onClick={() => window.open(seller.website, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Se tilbud hos leasingselskab
                  </Button>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>

        {/* Similar Cars Section */}
        {car && (
          <div className="mt-16">
            <Separator className="mb-8" />
            <CarListingGrid
              title={`Lignende biler som ${car.make} ${car.model}`}
              cars={similarCars}
              isLoading={similarLoading}
              error={similarError?.message || null}
              ctaText="Se alle biler"
              ctaLink="/listings"
              showCta={true}
              maxCards={6}
            />
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
            />

            {/* Mobile Price Overlay */}
            <MobilePriceOverlay
              isOpen={mobilePriceOpen}
              onClose={() => setMobilePriceOpen(false)}
              car={car}
              seller={seller}
              leaseOptions={leaseOptions}
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
            />
          </>
        )}
      </div>
    </BaseLayout>
  )
}

export default Listing