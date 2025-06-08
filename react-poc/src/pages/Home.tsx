import React, { useState, useEffect } from 'react'
import { supabase, type CarListing } from '../lib/supabase'
import Header from '../components/Header'
import HeroBanner from '../components/HeroBanner'

const Home: React.FC = () => {
  const [latestListings, setLatestListings] = useState<CarListing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const { data, error } = await supabase
          .from('full_listing_view')
          .select('*')
          .limit(4)

        if (!error && data) {
          setLatestListings(data.filter(listing => listing && listing.listing_id))
        } else {
          console.error('❌ Error fetching data:', error)
        }
      } catch (err) {
        console.error('💥 Exception during fetch:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchListings()
  }, [])

  return (
    <div className="min-h-screen flex flex-col text-foreground bg-secondary">
      {/* Header */}
      <Header />
      
      {/* Hero section */}
      <HeroBanner />

      {/* Main content */}
      <main className="flex-1 w-full pb-6">
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

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-card rounded-lg shadow-md border border-border p-4 animate-pulse">
                      <div className="bg-muted h-48 rounded-md mb-4"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-4 bg-muted rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {latestListings.map((car) => (
                    <div key={car.listing_id} className="bg-card rounded-lg shadow-md border border-border overflow-hidden hover:shadow-xl transition-shadow">
                      <div className="aspect-video bg-muted flex items-center justify-center">
                        {car.image ? (
                          <img 
                            src={car.image} 
                            alt={`${car.make} ${car.model}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-muted-foreground">Ingen billede</div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-primary text-lg">
                          {car.make} {car.model}
                        </h3>
                        {car.variant && (
                          <p className="text-muted-foreground text-sm">{car.variant}</p>
                        )}
                        <p className="text-lg font-semibold text-foreground mt-2">
                          {car.monthly_price?.toLocaleString('da-DK')} kr/måned
                        </p>
                        <div className="mt-3 flex justify-between text-sm text-muted-foreground">
                          <span>{car.fuel_type || '–'}</span>
                          <span>{car.transmission || '–'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loading && latestListings.length > 0 && (
                <div className="text-center mt-8">
                  <button className="bg-primary text-primary-foreground px-6 py-3 rounded-md font-semibold hover:bg-primary/90 transition-colors">
                    Se alle biler
                  </button>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border p-6">
        <div className="mx-auto w-full max-w-[1440px] px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2025 Leasingbørsen | Inspired by Carwow
          </p>
          <div className="flex gap-6 text-sm">
            <a href="#" className="text-muted-foreground hover:text-accent transition">
              About Us
            </a>
            <a href="#" className="text-muted-foreground hover:text-accent transition">
              Privacy
            </a>
            <a href="#" className="text-muted-foreground hover:text-accent transition">
              Terms
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Home