import React, { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { 
  ArrowLeft, 
  Car, 
  Fuel, 
  Settings, 
  Gauge, 
  Loader2,
  ExternalLink,
  RotateCcw,
  Users
} from 'lucide-react'
import { useListing, useListings } from '@/hooks/useListings'
import BaseLayout from '@/components/BaseLayout'
import CarListingGrid from '@/components/CarListingGrid'
import MobilePriceOverlay from '@/components/MobilePriceOverlay'
import MobilePriceBar from '@/components/MobilePriceBar'
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

  // Lease configuration state
  const [selectedMileage, setSelectedMileage] = useState<number | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null)
  const [selectedUpfront, setSelectedUpfront] = useState<number | null>(null)
  
  // Mobile price overlay state
  const [mobilePriceOpen, setMobilePriceOpen] = useState(false)

  // Mock lease options - in real implementation, this would come from API
  const leaseOptions = useMemo(() => [
    { mileage_per_year: 10000, period_months: 36, first_payment: 0, monthly_price: car?.monthly_price || 0 },
    { mileage_per_year: 15000, period_months: 36, first_payment: 0, monthly_price: (car?.monthly_price || 0) + 200 },
    { mileage_per_year: 20000, period_months: 36, first_payment: 0, monthly_price: (car?.monthly_price || 0) + 400 },
    { mileage_per_year: 10000, period_months: 48, first_payment: 0, monthly_price: (car?.monthly_price || 0) - 150 },
    { mileage_per_year: 15000, period_months: 48, first_payment: 0, monthly_price: (car?.monthly_price || 0) + 50 },
    { mileage_per_year: 20000, period_months: 48, first_payment: 0, monthly_price: (car?.monthly_price || 0) + 250 },
    { mileage_per_year: 10000, period_months: 36, first_payment: 50000, monthly_price: (car?.monthly_price || 0) - 300 },
    { mileage_per_year: 15000, period_months: 36, first_payment: 50000, monthly_price: (car?.monthly_price || 0) - 100 },
  ], [car?.monthly_price])

  // Derived options
  const availableMileages = useMemo(() => 
    [...new Set(leaseOptions.map(o => o.mileage_per_year))].sort((a, b) => a - b),
    [leaseOptions]
  )
  
  const availablePeriods = useMemo(() => 
    [...new Set(leaseOptions.map(o => o.period_months))].sort((a, b) => a - b),
    [leaseOptions]
  )
  
  const availableUpfronts = useMemo(() => 
    [...new Set(leaseOptions.map(o => o.first_payment))].sort((a, b) => a - b),
    [leaseOptions]
  )

  // Selected lease option
  const selectedLease = useMemo(() => 
    leaseOptions.find(o =>
      o.mileage_per_year === selectedMileage &&
      o.period_months === selectedPeriod &&
      o.first_payment === selectedUpfront
    ),
    [leaseOptions, selectedMileage, selectedPeriod, selectedUpfront]
  )

  // Reset to cheapest option
  const resetToCheapest = () => {
    const cheapest = leaseOptions.reduce((prev, curr) => 
      prev.monthly_price < curr.monthly_price ? prev : curr
    )
    if (cheapest) {
      setSelectedMileage(cheapest.mileage_per_year)
      setSelectedPeriod(cheapest.period_months)
      setSelectedUpfront(cheapest.first_payment)
    }
  }

  // Initialize with cheapest option
  useEffect(() => {
    if (leaseOptions.length && !selectedLease) {
      resetToCheapest()
    }
  }, [leaseOptions, selectedLease])

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
        {/* Back Navigation */}
        <div className="mb-6">
          <Link to="/listings">
            <Button variant="link" size="sm" className="p-0 h-auto">
              Tilbage til søgning
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Car Header */}
            <div className="space-y-0 mb-4">
              <h1 className="text-3xl font-bold text-foreground leading-tight">
                {car.make} {car.model}
              </h1>
              {car.variant && (
                <p className="text-lg text-muted-foreground font-normal leading-relaxed">{car.variant}</p>
              )}
            </div>

            {/* Car Image */}
            <Card className="bg-card shadow-lg border border-border/50 rounded-xl overflow-hidden">
              <div className="relative overflow-hidden bg-gradient-to-br from-muted to-muted/70">
                {car.image ? (
                  <img 
                    src={car.image} 
                    alt={`${car.make} {car.model}`}
                    className="w-full h-96 object-cover transition-opacity duration-500 ease-out"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-96 bg-gradient-to-br from-muted to-muted/70 flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <Car className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>Billede ikke tilgængeligt</p>
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/0 via-transparent to-transparent"></div>
              </div>
            </Card>

            {/* Car Specifications */}
            <div>
              {/* Key Specs Section */}
              <div className="space-y-0 mb-4">
                <h2 className="text-lg font-bold text-foreground leading-tight">
                  Specifikationer
                </h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6 text-sm">
                {car.horsepower && (
                  <div className="flex items-center gap-3">
                    <Gauge className="w-7 h-7 text-muted-foreground/60" />
                    <div>
                      <div className="text-muted-foreground/60 uppercase text-xs font-medium">Hestekræfter</div>
                      <div className="font-bold text-foreground">{car.horsepower} hk</div>
                    </div>
                  </div>
                )}
                
                {car.transmission && (
                  <div className="flex items-center gap-3">
                    <Settings className="w-7 h-7 text-muted-foreground/60" />
                    <div>
                      <div className="text-muted-foreground/60 uppercase text-xs font-medium">Gearkasse</div>
                      <div className="font-bold text-foreground">{car.transmission}</div>
                    </div>
                  </div>
                )}
                
                {car.fuel_type && (
                  <div className="flex items-center gap-3">
                    <Fuel className="w-7 h-7 text-muted-foreground/60" />
                    <div>
                      <div className="text-muted-foreground/60 uppercase text-xs font-medium">Drivmiddel</div>
                      <div className="font-bold text-foreground">{car.fuel_type}</div>
                    </div>
                  </div>
                )}
                
                {car.body_type && (
                  <div className="flex items-center gap-3">
                    <Car className="w-7 h-7 text-muted-foreground/60" />
                    <div>
                      <div className="text-muted-foreground/60 uppercase text-xs font-medium">Karrosseri</div>
                      <div className="font-bold text-foreground">{car.body_type}</div>
                    </div>
                  </div>
                )}
                
                {car.seats && (
                  <div className="flex items-center gap-3">
                    <Users className="w-7 h-7 text-muted-foreground/60" />
                    <div>
                      <div className="text-muted-foreground/60 uppercase text-xs font-medium">Sæder</div>
                      <div className="font-bold text-foreground">{car.seats}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Spacer Divider */}
              <div className="my-8 border-t border-border"></div>

              {/* General Specs Section */}
              <h3 className="text-lg font-bold text-foreground mb-4">Generelle specifikationer</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="divide-y divide-border">
                  {car.make && (
                    <div className="flex justify-between py-2">
                      <span className="font-medium text-muted-foreground">Mærke</span>
                      <span className="font-semibold text-foreground">{car.make}</span>
                    </div>
                  )}
                  {car.model && (
                    <div className="flex justify-between py-2">
                      <span className="font-medium text-muted-foreground">Model</span>
                      <span className="font-semibold text-foreground">{car.model}</span>
                    </div>
                  )}
                  {car.variant && (
                    <div className="flex justify-between py-2">
                      <span className="font-medium text-muted-foreground">Variant</span>
                      <span className="font-semibold text-foreground">{car.variant}</span>
                    </div>
                  )}
                  {car.year && (
                    <div className="flex justify-between py-2">
                      <span className="font-medium text-muted-foreground">Årgang</span>
                      <span className="font-semibold text-foreground">{car.year}</span>
                    </div>
                  )}
                  {car.drive_type && (
                    <div className="flex justify-between py-2">
                      <span className="font-medium text-muted-foreground">Drivtype</span>
                      <span className="font-semibold text-foreground">{car.drive_type}</span>
                    </div>
                  )}
                  {car.doors && car.doors > 0 && (
                    <div className="flex justify-between py-2">
                      <span className="font-medium text-muted-foreground">Døre</span>
                      <span className="font-semibold text-foreground">{car.doors}</span>
                    </div>
                  )}
                  {car.mileage_per_year && car.mileage_per_year > 0 && (
                    <div className="flex justify-between py-2">
                      <span className="font-medium text-muted-foreground">Årligt kørsel</span>
                      <span className="font-semibold text-foreground">{car.mileage_per_year.toLocaleString('da-DK')} km/år</span>
                    </div>
                  )}
                </div>
                <div className="divide-y divide-border">
                  {car.wltp && car.wltp > 0 && (
                    <div className="flex justify-between py-2">
                      <span className="font-medium text-muted-foreground">WLTP</span>
                      <span className="font-semibold text-foreground">{car.wltp} km</span>
                    </div>
                  )}
                  {car.co2_emission && car.co2_emission > 0 && (
                    <div className="flex justify-between py-2">
                      <span className="font-medium text-muted-foreground">CO₂ udslip</span>
                      <span className="font-semibold text-foreground">{car.co2_emission} g/km</span>
                    </div>
                  )}
                  {car.consumption_l_100km && car.consumption_l_100km > 0 && (
                    <div className="flex justify-between py-2">
                      <span className="font-medium text-muted-foreground">Forbrug (benzin)</span>
                      <span className="font-semibold text-foreground">{car.consumption_l_100km} l/100km</span>
                    </div>
                  )}
                  {car.consumption_kwh_100km && car.consumption_kwh_100km > 0 && (
                    <div className="flex justify-between py-2">
                      <span className="font-medium text-muted-foreground">Forbrug (el)</span>
                      <span className="font-semibold text-foreground">{car.consumption_kwh_100km} kWh/100km</span>
                    </div>
                  )}
                  {car.co2_tax_half_year && car.co2_tax_half_year > 0 && (
                    <div className="flex justify-between py-2">
                      <span className="font-medium text-muted-foreground">CO₂-afgift (halvår)</span>
                      <span className="font-semibold text-foreground">{car.co2_tax_half_year.toLocaleString('da-DK')} kr</span>
                    </div>
                  )}
                  {(car.colour || car.color) && (
                    <div className="flex justify-between py-2">
                      <span className="font-medium text-muted-foreground">Farve</span>
                      <span className="font-semibold text-foreground">{car.colour || car.color}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Lease Calculator Card - Hidden on mobile */}
            <Card className="hidden lg:block bg-card shadow-lg border border-border/50 rounded-xl overflow-hidden sticky" style={{top: '90px'}}>
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