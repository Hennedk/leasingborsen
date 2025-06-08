import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useFilterStore } from '@/stores/filterStore'
import { useReferenceData } from '@/hooks/useReferenceData'
import { useListingCount } from '@/hooks/useListings'

const HeroBanner: React.FC = () => {
  const navigate = useNavigate()
  const { setFilter } = useFilterStore()
  const { data: referenceData } = useReferenceData()
  const [localFilters, setLocalFilters] = useState({
    make: '',
    model: '',
    body_type: '',
    price_max: null as number | null
  })

  // Price steps for max price dropdown
  const priceSteps = Array.from({ length: 10 }, (_, i) => (i + 1) * 1000)

  // Get filtered models based on selected make
  const filteredModels = useMemo(() => {
    if (!localFilters.make || !referenceData?.models) return []
    const selectedMake = referenceData.makes?.find((m: any) => m.name === localFilters.make)
    return referenceData.models.filter((m: any) => m.make_id === selectedMake?.id) || []
  }, [localFilters.make, referenceData])

  // Get result count for current filters
  const { data: countData } = useListingCount(localFilters)
  const resultCount = countData?.data || 0

  // Reset model when make changes
  useEffect(() => {
    setLocalFilters(prev => ({ ...prev, model: '' }))
  }, [localFilters.make])

  const handleFilterChange = (key: string, value: any) => {
    const filterValue = value === 'all' ? (key === 'price_max' ? null : '') : value
    const actualValue = key === 'price_max' && value !== 'all' ? parseInt(value) : filterValue
    
    setLocalFilters(prev => ({
      ...prev,
      [key]: actualValue,
      ...(key === 'make' && { model: '' }) // Reset model when make changes
    }))
  }

  const handleSearch = () => {
    // Update global filter state
    Object.entries(localFilters).forEach(([key, value]) => {
      if (value && value !== '') {
        setFilter(key as any, value)
      }
    })
    
    // Navigate to listings with filters
    const searchParams = new URLSearchParams()
    Object.entries(localFilters).forEach(([key, value]) => {
      if (value && value !== '' && value !== null) {
        searchParams.set(key, value.toString())
      }
    })
    
    navigate(`/listings?${searchParams.toString()}`)
  }

  return (
    <section className="relative overflow-hidden bg-background py-20 sm:py-32 lg:py-40">
      {/* Background decorative elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background"></div>
      <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl"></div>
      <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-accent/10 blur-3xl"></div>
      
      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <div className="mb-8 flex justify-center">
            <div className="relative rounded-full px-3 py-1 text-sm leading-6 text-muted-foreground ring-1 ring-primary/10 hover:ring-primary/20 transition-all">
              Nyt: Sammenlign over 1000+ leasingtilbud{' '}
              <a href="#" className="font-semibold text-primary">
                <span className="absolute inset-0" aria-hidden="true" />
                Se mere <span aria-hidden="true">&rarr;</span>
              </a>
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
            Find de bedste{' '}
            <span className="text-primary">leasingtilbud</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Sammenlign leasingaftaler fra forhandlere over hele Danmark – hurtigt og nemt. 
            Få det bedste tilbud på din nye bil.
          </p>
        </div>

        {/* Modern Search Form */}
        <div className="mx-auto max-w-4xl">
          <Card className="bg-card/95 backdrop-blur-sm border-0 shadow-2xl p-8">
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-card-foreground mb-2">
                  Start din søgning
                </h2>
                <p className="text-muted-foreground">
                  Udfyld kriterierne nedenfor for at finde din perfekte leasingbil
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Make Dropdown */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Mærke</Label>
                  <Select value={localFilters.make || 'all'} onValueChange={(value) => handleFilterChange('make', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Vælg mærke" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle mærker</SelectItem>
                      {referenceData?.makes?.map((make: any) => (
                        <SelectItem key={make.id} value={make.name}>
                          {make.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Model Dropdown */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Model</Label>
                  <Select 
                    value={localFilters.model || 'all'} 
                    onValueChange={(value) => handleFilterChange('model', value)}
                    disabled={!localFilters.make}
                  >
                    <SelectTrigger>
                      <SelectValue 
                        placeholder={localFilters.make ? 'Vælg model' : 'Vælg mærke først'} 
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle modeller</SelectItem>
                      {filteredModels.map((model: any) => (
                        <SelectItem key={model.id} value={model.name}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Vehicle Type Dropdown */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Biltype</Label>
                  <Select value={localFilters.body_type || 'all'} onValueChange={(value) => handleFilterChange('body_type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Alle typer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle biltyper</SelectItem>
                      {referenceData?.bodyTypes?.map((bodyType: any) => (
                        <SelectItem key={bodyType.name} value={bodyType.name}>
                          {bodyType.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Max Price Dropdown */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Maks pris</Label>
                  <Select 
                    value={localFilters.price_max?.toString() || 'all'} 
                    onValueChange={(value) => handleFilterChange('price_max', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Ingen grænse" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Ingen grænse</SelectItem>
                      {priceSteps.map((price) => (
                        <SelectItem key={price} value={price.toString()}>
                          {price.toLocaleString('da-DK')} kr./mdr
                        </SelectItem>
                      ))}
                      <SelectItem value="9999999">10.000+ kr./mdr</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Search Button */}
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                <Button 
                  onClick={handleSearch}
                  size="lg"
                  className="w-full sm:w-auto min-w-[200px]"
                >
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Søg blandt {resultCount} biler
                </Button>
                <p className="text-sm text-muted-foreground">
                  Gratis og uforpligtende
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Trust indicators */}
        <div className="mt-16 text-center">
          <p className="text-sm font-semibold text-muted-foreground mb-8">
            Tillid fra tusindvis af kunder
          </p>
          <div className="flex justify-center items-center space-x-8 opacity-50">
            {/* You can add actual logo images here */}
            <div className="text-2xl font-bold text-muted-foreground">Mercedes</div>
            <div className="text-2xl font-bold text-muted-foreground">BMW</div>
            <div className="text-2xl font-bold text-muted-foreground">Audi</div>
            <div className="text-2xl font-bold text-muted-foreground">Volkswagen</div>
          </div>
        </div>

        {/* Promotional Banner */}
        <div className="mt-20 text-center">
          <img 
            src="https://a.storyblok.com/f/143588/840x287/6cc6a872d2/cin00416_q4-spring-price-reduction-2025-840x287.png/m/750x0/filters:quality(75)" 
            alt="Spring Price Reduction 2025 - Special leasing offers" 
            className="mx-auto max-w-2xl w-full rounded-2xl shadow-xl hover:shadow-2xl transition-shadow duration-300"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  )
}

export default HeroBanner