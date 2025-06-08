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
    <section className="hero min-h-[400px] lg:min-h-[600px] bg-gradient-to-br from-primary via-primary to-primary relative overflow-hidden w-full">
      {/* Enhanced Background decorative elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-black/20 to-black/40"></div>
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-white/5 via-white/2 to-transparent"></div>
      <div className="absolute bottom-0 left-0 w-1/3 h-1/2 bg-gradient-to-tr from-white/3 to-transparent"></div>
      {/* Subtle radial gradient behind content */}
      <div className="absolute inset-0 bg-radial-gradient from-white/5 via-transparent to-transparent"></div>
      
      <div className="w-full">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-6 py-6 lg:py-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-12 w-full items-center">
            
            {/* LEFT SIDE: Promotional Text with enhanced contrast */}
            <div className="order-1 lg:order-1 lg:col-span-3 text-center px-4 py-4 lg:px-8 lg:py-6 animate-slide-in-left">
              <div className="max-w-none space-y-4 lg:space-y-6">
                <div className="space-y-3 lg:space-y-4">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white leading-tight tracking-tight">
                    Find de bedste leasingtilbud
                  </h1>
                  <p className="text-base sm:text-lg lg:text-xl text-white/85 leading-relaxed tracking-wide max-w-2xl mx-auto">
                    Sammenlign leasingaftaler fra forhandlere over hele Danmark – hurtigt og nemt.
                  </p>
                </div>
                
                {/* Promotional Banner Image with reduced gap */}
                <div className="mt-6 lg:mt-8 animate-slide-in-up" style={{animationDelay: '0.4s'}}>
                  <img 
                    src="https://a.storyblok.com/f/143588/840x287/6cc6a872d2/cin00416_q4-spring-price-reduction-2025-840x287.png/m/750x0/filters:quality(75)" 
                    alt="Spring Price Reduction 2025 - Special leasing offers" 
                    className="w-full max-w-lg mx-auto rounded-xl shadow-2xl transform hover:scale-[1.02] transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>

            {/* RIGHT SIDE: Search Box with improved grouping */}
            <div className="order-2 lg:order-2 lg:col-span-2 animate-slide-in-right px-2 py-4 lg:p-0">
              <Card className="bg-card backdrop-blur-md rounded-3xl shadow-2xl p-6 lg:p-8 w-full max-w-[95%] sm:max-w-lg lg:max-w-none mx-auto border border-border/50 space-y-6 lg:space-y-8 transition-all duration-500 ease-in hover:shadow-xl">
                {/* Grouped heading and form with enhanced spacing */}
                <div className="space-y-3 lg:space-y-4">
                  <h2 className="text-xl lg:text-2xl font-bold text-card-foreground text-center lg:text-left leading-tight">
                    Søg blandt hundredvis af leasingbiler – find din drømmebil nu
                  </h2>
                  
                  <div className="space-y-4 lg:space-y-6">
                    {/* First Row: Make and Model */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                      {/* Make Dropdown */}
                      <div className="space-y-2">
                        <Label className="font-semibold text-primary">Mærke</Label>
                        <Select value={localFilters.make || 'all'} onValueChange={(value) => handleFilterChange('make', value)}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Vælg mærke" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Vælg mærke</SelectItem>
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
                        <Label className="font-semibold text-primary">Model</Label>
                        <Select 
                          value={localFilters.model || 'all'} 
                          onValueChange={(value) => handleFilterChange('model', value)}
                          disabled={!localFilters.make}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue 
                              placeholder={localFilters.make ? 'Vælg model' : 'Vælg mærke først'} 
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">
                              {localFilters.make ? 'Vælg model' : 'Vælg mærke først'}
                            </SelectItem>
                            {filteredModels.map((model: any) => (
                              <SelectItem key={model.id} value={model.name}>
                                {model.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Second Row: Vehicle Type and Max Price */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                      {/* Vehicle Type Dropdown */}
                      <div className="space-y-2">
                        <Label className="font-semibold text-primary">Biltype</Label>
                        <Select value={localFilters.body_type || 'all'} onValueChange={(value) => handleFilterChange('body_type', value)}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Alle biltyper" />
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
                        <Label className="font-semibold text-primary">Maks pris</Label>
                        <Select 
                          value={localFilters.price_max?.toString() || 'all'} 
                          onValueChange={(value) => handleFilterChange('price_max', value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Ingen grænse" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Ingen grænse</SelectItem>
                            {priceSteps.map((price) => (
                              <SelectItem key={price} value={price.toString()}>
                                {price.toLocaleString('da-DK')} kr./måned
                              </SelectItem>
                            ))}
                            <SelectItem value="9999999">10.000+ kr./måned</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enhanced Primary CTA */}
                <Button 
                  onClick={handleSearch}
                  size="lg"
                  className="w-full shadow-xl hover:shadow-2xl font-bold tracking-wide"
                >
                  Vis {resultCount} biler
                </Button>
              </Card>
            </div>
            
          </div>
        </div>
      </div>
    </section>
  )
}

export default HeroBanner