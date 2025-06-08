import React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useListings } from '@/hooks/useListings'
import BaseLayout from '@/components/BaseLayout'
import HeroBanner from '@/components/HeroBanner'
import ListingCard from '@/components/ListingCard'

const Home: React.FC = () => {
  const { data: listingsResponse, isLoading, error } = useListings({}, 4)

  return (
    <BaseLayout containerPadding={false}>
      {/* Hero Banner with Search */}
      <HeroBanner />
      
      <div className="pb-6">
        <div className="mx-auto w-full max-w-[1440px] px-6">
          <div className="space-y-12 pt-12 sm:pt-16">
            
            {/* Latest Cars section */}
            <section className="space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-foreground mb-4">
                  Seneste biler
                </h2>
                <p className="text-muted-foreground">
                  Udforsk vores nyeste leasingtilbud
                </p>
              </div>

              {error && (
                <div className="bg-destructive text-destructive-foreground p-4 rounded-lg">
                  Der opstod en fejl ved indlæsning af biler
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <ListingCard key={i} loading={true} />
                  ))
                ) : listingsResponse?.data && listingsResponse.data.length > 0 ? (
                  listingsResponse.data.map((car) => (
                    <ListingCard 
                      key={car.listing_id} 
                      car={{
                        ...car,
                        id: car.listing_id || car.id
                      }} 
                    />
                  ))
                ) : (
                  <div className="col-span-full text-center text-muted-foreground py-12">
                    <p className="text-lg">Ingen biler tilgængelige</p>
                    <p className="text-sm mt-2">Prøv at justere dine søgekriterier</p>
                  </div>
                )}
              </div>

              {listingsResponse?.data && listingsResponse.data.length > 0 && (
                <div className="text-center mt-8">
                  <Link to="/listings">
                    <Button size="lg" className="font-semibold">
                      Se alle biler
                    </Button>
                  </Link>
                </div>
              )}
            </section>

            {/* Popular Categories section */}
            <section className="space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-foreground mb-4">
                  Populære kategorier
                </h2>
                <p className="text-muted-foreground">
                  Find biler inden for de mest søgte kategorier
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { name: 'SUV', count: '125+ biler', image: '🚙' },
                  { name: 'Elbiler', count: '89+ biler', image: '⚡' },
                  { name: 'Stationcar', count: '67+ biler', image: '🚗' },
                  { name: 'Cabriolet', count: '23+ biler', image: '🏎️' }
                ].map((category) => (
                  <Link
                    key={category.name}
                    to={`/listings?body_type=${encodeURIComponent(category.name)}`}
                    className="group"
                  >
                    <div className="bg-card border border-border rounded-lg p-6 text-center hover:shadow-lg hover:border-primary/20 transition-all duration-300">
                      <div className="text-4xl mb-3">{category.image}</div>
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {category.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {category.count}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {/* Call to Action section */}
            <section className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-2xl p-8 text-center">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Klar til at finde din næste bil?
              </h2>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Med hundredvis af leasingtilbud fra forhandlere over hele Danmark, 
                er det nemt at sammenligne og finde den perfekte bil til dine behov.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link to="/listings">
                  <Button size="lg" className="font-semibold">
                    Udforsk alle biler
                  </Button>
                </Link>
                <Link to="/about">
                  <Button variant="outline" size="lg">
                    Læs mere om os
                  </Button>
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </BaseLayout>
  )
}

export default Home