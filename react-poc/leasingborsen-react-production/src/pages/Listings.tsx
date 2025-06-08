import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Filter, Grid, List, SlidersHorizontal } from 'lucide-react'
import { useListings } from '@/hooks/useListings'
import { useFilterStore } from '@/stores/filterStore'
import BaseLayout from '@/components/BaseLayout'
import FilterSidebar from '@/components/FilterSidebar'
import ListingCard from '@/components/ListingCard'

const Listings: React.FC = () => {
  const [searchParams] = useSearchParams()
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  
  const { 
    make, 
    model, 
    body_type, 
    price_max,
    setFilter 
  } = useFilterStore()

  // Initialize filters from URL params
  useEffect(() => {
    const urlMake = searchParams.get('make')
    const urlModel = searchParams.get('model')
    const urlBodyType = searchParams.get('body_type')
    const urlPriceMax = searchParams.get('price_max')

    if (urlMake && urlMake !== make) setFilter('make', urlMake)
    if (urlModel && urlModel !== model) setFilter('model', urlModel)
    if (urlBodyType && urlBodyType !== body_type) setFilter('body_type', urlBodyType)
    if (urlPriceMax && parseInt(urlPriceMax) !== price_max) {
      setFilter('price_max', parseInt(urlPriceMax))
    }
  }, [searchParams])

  const currentFilters = { make, model, body_type, price_max }
  const { data: listingsResponse, isLoading, error } = useListings(currentFilters, 20)

  const listings = listingsResponse?.data || []
  const resultCount = listings.length

  return (
    <BaseLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-4">
            Søg efter leasingbiler
          </h1>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-base px-3 py-1">
                {resultCount} biler fundet
              </Badge>
              {(make || model || body_type || price_max) && (
                <span className="text-sm text-muted-foreground">
                  med aktive filtre
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {/* Mobile Filter Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
                className="md:hidden"
              >
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                Filtre
              </Button>
              
              {/* View Mode Toggle */}
              <div className="flex border border-border rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none"
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden md:block w-80 flex-shrink-0">
            <FilterSidebar />
          </aside>

          {/* Mobile Filter Overlay */}
          {mobileFilterOpen && (
            <div className="fixed inset-0 z-50 md:hidden">
              <div 
                className="absolute inset-0 bg-black/50"
                onClick={() => setMobileFilterOpen(false)}
              />
              <div className="absolute left-0 top-0 h-full w-80 bg-background">
                <FilterSidebar 
                  isOpen={mobileFilterOpen}
                  onClose={() => setMobileFilterOpen(false)}
                />
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {error && (
              <div className="bg-destructive text-destructive-foreground p-4 rounded-lg mb-6">
                Der opstod en fejl ved indlæsning af biler. Prøv igen senere.
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className={`grid gap-6 ${
                viewMode === 'grid' 
                  ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' 
                  : 'grid-cols-1'
              }`}>
                {Array.from({ length: 9 }).map((_, i) => (
                  <ListingCard key={i} loading={true} />
                ))}
              </div>
            )}

            {/* Results */}
            {!isLoading && !error && (
              <>
                {listings.length > 0 ? (
                  <div className={`grid gap-6 ${
                    viewMode === 'grid' 
                      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' 
                      : 'grid-cols-1'
                  }`}>
                    {listings.map((car) => (
                      <ListingCard 
                        key={car.listing_id || car.id} 
                        car={{
                          ...car,
                          id: car.listing_id || car.id
                        }} 
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="max-w-md mx-auto">
                      <Filter className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-foreground mb-2">
                        Ingen biler fundet
                      </h3>
                      <p className="text-muted-foreground mb-6">
                        Der er ingen biler, der matcher dine søgekriterier. 
                        Prøv at justere filtrene for at se flere resultater.
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => {
                          // Reset filters logic could go here
                          window.location.href = '/listings'
                        }}
                      >
                        Nulstil alle filtre
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Load More Button (for future pagination) */}
            {!isLoading && listings.length > 0 && listings.length >= 20 && (
              <div className="text-center mt-12">
                <Button variant="outline" size="lg">
                  Indlæs flere biler
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </BaseLayout>
  )
}

export default Listings