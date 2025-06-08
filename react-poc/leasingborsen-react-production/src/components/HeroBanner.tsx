import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { useFilterStore } from '@/stores/filterStore'
import { useReferenceData } from '@/hooks/useReferenceData'
import { useListingCount } from '@/hooks/useListings'
import Container from '@/components/Container'
import './HeroBanner.css'

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
    /* =================================================
       HERO BANNER SECTION - Main container with gradient background
       Min height: 400px mobile, 500px desktop
    ================================================= */
    <section className="min-h-[400px] lg:min-h-[500px] bg-gradient-to-br from-primary via-primary to-primary relative overflow-hidden w-full">
      
      {/* =================
          BACKGROUND OVERLAYS - Multiple gradient layers for visual depth
      ================= */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-black/20 to-black/40"></div>
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-white/5 via-white/2 to-transparent"></div>
      <div className="absolute bottom-0 left-0 w-1/3 h-1/2 bg-gradient-to-tr from-white/3 to-transparent"></div>
      <div className="absolute inset-0 bg-radial-gradient from-white/5 via-transparent to-transparent"></div>
      
      {/* =================
          CONTENT CONTAINER - Main content wrapper with responsive padding
      ================= */}
      <div className="w-full">
        <Container className="py-6 lg:py-8 relative z-10">
          
          {/* =================
              RESPONSIVE GRID LAYOUT
              Mobile: 1 column | Desktop: 55/45 split (1.1fr/0.9fr)
              Gap: 24px mobile, 32px desktop
          ================= */}
          <div className="grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-6 md:gap-8 w-full items-center">
            
            {/* =========================================
                LEFT COLUMN: Promotional Content
                - Main headline
                - Descriptive text
                - Promotional banner image
            ========================================= */}
            <div className="order-1 md:order-1 text-center animate-slide-in-left px-4 md:pl-0 md:pr-6 py-4">
              {/* Text Content Wrapper - 24px vertical spacing */}
              <div className="max-w-none space-y-6">
                
                {/* Main Headline & Subtitle Group - 16px internal spacing */}
                <div className="space-y-4">
                  {/* Primary Headline - Fluid typography: 28px-48px */}
                  <h1 className="font-bold text-white leading-tight tracking-tight" style={{fontSize: 'clamp(1.75rem, 5vw, 3rem)'}}>
                    Find de bedste leasingtilbud
                  </h1>
                  
                  {/* Descriptive Subtitle - Fluid typography: 16px-20px */}
                  <p className="text-white/85 leading-relaxed tracking-wide max-w-2xl mx-auto" style={{fontSize: 'clamp(1rem, 2.5vw, 1.25rem)'}}>
                    Sammenlign leasingaftaler fra forhandlere over hele Danmark – hurtigt og nemt.
                  </p>
                </div>
                
                {/* Marketing Banner Image - Delayed animation (0.4s) */}
                <div className="mt-6 animate-slide-in-up" style={{animationDelay: '0.4s'}}>
                  {/* Promotional Image - Responsive scaling: 80% mobile, 100% desktop */}
                  <img 
                    src="https://a.storyblok.com/f/143588/840x287/6cc6a872d2/cin00416_q4-spring-price-reduction-2025-840x287.png/m/750x0/filters:quality(75)" 
                    alt="Spring Price Reduction 2025 - Special leasing offers" 
                    className="w-full max-w-lg mx-auto rounded-xl shadow-2xl transform hover:scale-[1.02] transition-transform duration-300 scale-[0.8] md:scale-100"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>

            {/* =========================================
                RIGHT COLUMN: Search Form
                - Form title
                - 4 filter dropdowns (2x2 grid)
                - Search CTA button
            ========================================= */}
            <div className="order-2 md:order-2 animate-slide-in-right px-2 md:pl-6 md:pr-0">
              
              {/* Search Form Card - Backdrop blur with hover effects */}
              {/* Width: 300px-450px responsive, 95% max on mobile */}
              <div className="bg-card backdrop-blur-md rounded-3xl shadow-2xl border border-border/50 transition-all duration-500 ease-in hover:shadow-xl md:mr-0 p-4 md:p-6" style={{width: 'clamp(300px, 40vw, 450px)', maxWidth: '95%'}}>
                {/* Form Content Wrapper - 24px vertical spacing */}
                <div className="space-y-6">
                  
                  {/* Form Title - Fluid typography: 20px-24px */}
                  <h2 className="font-bold text-card-foreground text-center md:text-left leading-tight" style={{fontSize: 'clamp(1.25rem, 3vw, 1.5rem)'}}>
                    Søg blandt hundredvis af leasingbiler – find din drømmebil nu
                  </h2>
                  
                  {/* Form Fields Container - 16px vertical spacing between rows */}
                  <div className="space-y-4">
                    
                    {/* ===== FILTER ROW 1: Vehicle Make & Model ===== */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        label="Mærke"
                        value={localFilters.make || 'all'}
                        onValueChange={(value) => handleFilterChange('make', value)}
                        placeholder="Vælg mærke"
                        options={[
                          { value: 'all', label: 'Vælg mærke' },
                          ...(referenceData?.makes?.map((make: any) => ({
                            value: make.name,
                            label: make.name
                          })) || [])
                        ]}
                      />

                      <FormField
                        label="Model"
                        value={localFilters.model || 'all'}
                        onValueChange={(value) => handleFilterChange('model', value)}
                        placeholder={localFilters.make ? 'Vælg model' : 'Vælg mærke først'}
                        disabled={!localFilters.make}
                        options={[
                          { value: 'all', label: localFilters.make ? 'Vælg model' : 'Vælg mærke først' },
                          ...filteredModels.map((model: any) => ({
                            value: model.name,
                            label: model.name
                          }))
                        ]}
                      />
                    </div>

                    {/* ===== FILTER ROW 2: Vehicle Type & Price Range ===== */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        label="Biltype"
                        value={localFilters.body_type || 'all'}
                        onValueChange={(value) => handleFilterChange('body_type', value)}
                        placeholder="Alle biltyper"
                        options={[
                          { value: 'all', label: 'Alle biltyper' },
                          ...(referenceData?.bodyTypes?.map((bodyType: any) => ({
                            value: bodyType.name,
                            label: bodyType.name
                          })) || [])
                        ]}
                      />

                      <FormField
                        label="Maks pris"
                        value={localFilters.price_max?.toString() || 'all'}
                        onValueChange={(value) => handleFilterChange('price_max', value)}
                        placeholder="Ingen grænse"
                        options={[
                          { value: 'all', label: 'Ingen grænse' },
                          ...priceSteps.map((price) => ({
                            value: price.toString(),
                            label: `${price.toLocaleString('da-DK')} kr./måned`
                          })),
                          { value: '9999999', label: '10.000+ kr./måned' }
                        ]}
                      />
                    </div>
                  </div>
                </div>

                {/* ===== CALL-TO-ACTION BUTTON ===== */}
                {/* 16px top padding for separation from form fields */}
                <div className="pt-4">
                  {/* Primary Search Button - 48px height, full width */}
                  <Button 
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold tracking-wide rounded-lg shadow-xl hover:shadow-2xl transition-all duration-200" 
                    onClick={handleSearch}
                    aria-label="Søg efter biler med de valgte kriterier"
                  >
                    Vis {resultCount} biler
                  </Button>
                </div>
              </div>
            </div>
            
          </div>
        </Container>
      </div>

    </section>
  )
}

export default HeroBanner