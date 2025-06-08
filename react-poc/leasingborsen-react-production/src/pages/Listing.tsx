import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  ArrowLeft, 
  Car, 
  Fuel, 
  Settings, 
  Gauge, 
  Calendar,
  MapPin,
  Phone,
  Mail,
  Heart,
  Share2,
  Calculator,
  Loader2
} from 'lucide-react'
import { useListing } from '@/hooks/useListings'
import Header from '@/components/Header'

const Listing: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { data: listingResponse, isLoading, error } = useListing(id || '')

  const car = listingResponse?.data

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Indlæser bildetaljer...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !car) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
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
      </div>
    )
  }

  const formatPrice = (price?: number) => {
    return price ? `${price.toLocaleString('da-DK')} kr` : 'Pris ikke tilgængelig'
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Back Navigation */}
        <div className="mb-6">
          <Link to="/listings">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tilbage til søgning
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Car Header */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-3xl font-bold text-primary">
                      {car.make} {car.model}
                    </CardTitle>
                    {car.variant && (
                      <p className="text-lg text-muted-foreground mt-1">{car.variant}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Heart className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Car Image */}
            <Card>
              <CardContent className="p-0">
                {car.image ? (
                  <img 
                    src={car.image} 
                    alt={`${car.make} ${car.model}`}
                    className="w-full h-96 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full h-96 bg-muted flex items-center justify-center rounded-lg">
                    <div className="text-center text-muted-foreground">
                      <Car className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>Billede ikke tilgængeligt</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Car Specifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Specifikationer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {car.fuel_type && (
                    <div className="flex items-center gap-2">
                      <Fuel className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Brændstof</p>
                        <p className="font-medium">{car.fuel_type}</p>
                      </div>
                    </div>
                  )}
                  
                  {car.transmission && (
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Gearkasse</p>
                        <p className="font-medium">{car.transmission}</p>
                      </div>
                    </div>
                  )}
                  
                  {car.body_type && (
                    <div className="flex items-center gap-2">
                      <Car className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Biltype</p>
                        <p className="font-medium">{car.body_type}</p>
                      </div>
                    </div>
                  )}
                  
                  {car.horsepower && (
                    <div className="flex items-center gap-2">
                      <Gauge className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Hestekraft</p>
                        <p className="font-medium">{car.horsepower} hk</p>
                      </div>
                    </div>
                  )}
                  
                  {car.year && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Årgang</p>
                        <p className="font-medium">{car.year}</p>
                      </div>
                    </div>
                  )}
                  
                  {(car.colour || car.color) && (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Farve</p>
                        <p className="font-medium">{car.colour || car.color}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Pricing Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-primary">
                  {formatPrice(car.monthly_price)}/måned
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {car.first_payment && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Udbetaling:</span>
                    <span className="font-medium">{formatPrice(car.first_payment)}</span>
                  </div>
                )}
                
                {car.mileage_per_year && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kilometergrænse:</span>
                    <span className="font-medium">{car.mileage_per_year.toLocaleString('da-DK')} km/år</span>
                  </div>
                )}
                
                <Separator />
                
                <div className="space-y-3">
                  <Button className="w-full" size="lg">
                    <Phone className="w-4 h-4 mr-2" />
                    Ring til forhandler
                  </Button>
                  
                  <Button variant="outline" className="w-full" size="lg">
                    <Mail className="w-4 h-4 mr-2" />
                    Send besked
                  </Button>
                  
                  <Button variant="outline" className="w-full" size="lg">
                    <Calculator className="w-4 h-4 mr-2" />
                    Beregn leasing
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Dealer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Forhandler
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-medium">{car.seller_name || 'Forhandler ikke angivet'}</p>
                  <p className="text-sm text-muted-foreground">{car.seller_location || 'Lokation ikke angivet'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Status Badge */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Badge 
                    variant={(car.status || car.listing_status) === 'available' ? 'default' : 'secondary'}
                    className="text-sm px-4 py-2"
                  >
                    {(car.status || car.listing_status) === 'available' ? 'Tilgængelig' : 'Status ukendt'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Listing