import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useFilterStore } from '@/stores/consolidatedFilterStore'
import { useReferenceData } from '@/hooks/useReferenceData'
import { useListingCount } from '@/hooks/useListings'
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
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  // Price steps for max price dropdown
  const priceSteps = Array.from({ length: 10 }, (_, i) => (i + 1) * 1000)

  // Get filtered models based on selected make
  const filteredModels = useMemo(() => {
    if (!localFilters.make || !referenceData?.models) return []
    const selectedMake = referenceData.makes?.find((m: any) => m.name === localFilters.make)
    return referenceData.models.filter((m: any) => m.make_id === selectedMake?.id) || []
  }, [localFilters.make, referenceData])

  // Get result count for current filters
  const filterOptions = {
    makes: localFilters.make ? [localFilters.make] : [],
    models: localFilters.model ? [localFilters.model] : [],
    body_type: localFilters.body_type ? [localFilters.body_type] : [],
    price_max: localFilters.price_max
  }
  const { data: countData } = useListingCount(filterOptions)
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
        if (key === 'make') {
          setFilter('makes', [value as string])
        } else if (key === 'model') {
          setFilter('models', [value as string])
        } else if (key === 'body_type') {
          setFilter('body_type', [value as string])
        } else if (key === 'price_max') {
          setFilter('price_max', value as number)
        }
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
       Height controlled by container padding
    ================================================= */
    <section className="bg-gradient-to-br from-primary via-primary to-primary relative overflow-hidden w-full">
      
      {/* =================
          BACKGROUND OVERLAYS - Multiple gradient layers for visual depth
      ================= */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-black/20 to-black/40"></div>
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-white/5 via-white/2 to-transparent"></div>
      <div className="absolute bottom-0 left-0 w-1/3 h-1/2 bg-gradient-to-tr from-white/3 to-transparent"></div>
      <div className="absolute inset-0 bg-radial-gradient from-white/5 via-transparent to-transparent"></div>
      
      {/* =================
          CONTENT CONTAINER - Main content wrapper with 48px top/bottom padding
      ================= */}
      <div className="w-full">
        <div className="mx-auto w-full max-w-[1440px] px-6 md:px-12 py-6 md:py-12 relative z-10">
          
          {/* =================
              RESPONSIVE GRID LAYOUT
              Mobile: 1 column | Desktop: 50/50 split (equal columns)
              Gap: 4px mobile, 32px desktop
          ================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 md:gap-8 w-full items-center">
            
            {/* =========================================
                LEFT COLUMN: Promotional Content
                - Main headline
                - Descriptive text
                - Promotional banner image
            ========================================= */}
            <div className="order-2 md:order-2 text-left animate-slide-in-left">
              {/* Text Content Wrapper - 24px vertical spacing, full width */}
              <div className="w-full space-y-4 md:space-y-6">
                
                {/* Main Headline & Subtitle Group - 16px internal spacing */}
                <div className="space-y-4">
                  {/* Primary Headline - Fluid typography: 32px-56px */}
                  <h1 className="font-bold text-white leading-tight tracking-tight" style={{fontSize: 'clamp(2rem, 6vw, 3.5rem)'}}>
                    Find de bedste leasingtilbud
                  </h1>
                  
                  {/* Descriptive Subtitle - Fluid typography: 18px-24px */}
                  <p className="text-white/85 leading-relaxed tracking-wide" style={{fontSize: 'clamp(1.125rem, 3vw, 1.5rem)'}}>
                    Sammenlign leasingaftaler fra forhandlere over hele Danmark – hurtigt og nemt.
                  </p>
                </div>
                
              </div>
            </div>

            {/* =========================================
                RIGHT COLUMN: Search Form
                - Form title
                - 4 filter dropdowns (2x2 grid)
                - Search CTA button
            ========================================= */}
            <div className="order-1 md:order-1 animate-slide-in-right px-0 md:pl-0 md:pr-0">
              
              {/* Search Form Card - Backdrop blur with hover effects */}
              {/* Width: 350px-550px responsive, 95% max on mobile */}
              <div className="bg-card backdrop-blur-md rounded-3xl border border-border/50 transition-all duration-500 ease-in md:mr-0 p-3 md:p-6 max-w-xl">
                {/* Form Content Wrapper - 24px vertical spacing */}
                <div className="space-y-4 md:space-y-6">
                  
                  {/* Form Title - Fluid typography: 20px-24px */}
                  <h2 className="font-bold text-card-foreground text-left leading-tight text-lg md:text-xl">
                    <span className="hidden sm:inline">Find din drømmebil blandt hundredvis af leasingbiler</span>
                    <span className="sm:hidden">Find din drømmebil</span>
                  </h2>
                  
                  {/* Form Fields Container - 16px vertical spacing between rows */}
                  <div className="space-y-3 md:space-y-4">
                    
                    {/* ===== PRIMARY FILTERS: Make & Price ===== */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        label="Mærke"
                        value={localFilters.make || 'all'}
                        onValueChange={(value) => handleFilterChange('make', value)}
                        placeholder="Vælg mærke"
                        size="lg"
                        options={[
                          { value: 'all', label: 'Vælg mærke' },
                          ...(referenceData?.makes?.map((make: any) => ({
                            value: make.name,
                            label: make.name
                          })) || [])
                        ]}
                      />

                      <FormField
                        label="Maks pris"
                        value={localFilters.price_max?.toString() || 'all'}
                        onValueChange={(value) => handleFilterChange('price_max', value)}
                        placeholder="Ingen grænse"
                        size="lg"
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

                    {/* ===== ADVANCED FILTERS TOGGLE ===== */}
                    <div className="block md:hidden">
                      <button
                        type="button"
                        className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                      >
                        <span>Flere filtre</span>
                        {showAdvancedFilters ? 
                          <ChevronUp className="h-4 w-4" /> : 
                          <ChevronDown className="h-4 w-4" />
                        }
                      </button>
                    </div>

                    {/* ===== ADVANCED FILTERS: Model & Body Type ===== */}
                    <div className={`space-y-3 md:space-y-4 transition-all duration-200 md:block ${
                      showAdvancedFilters ? 'block' : 'hidden'
                    }`}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          label="Model"
                          value={localFilters.model || 'all'}
                          onValueChange={(value) => handleFilterChange('model', value)}
                          placeholder={localFilters.make ? 'Vælg model' : 'Vælg mærke først'}
                          disabled={!localFilters.make}
                          size="lg"
                          options={[
                            { value: 'all', label: localFilters.make ? 'Vælg model' : 'Vælg mærke først' },
                            ...filteredModels.map((model: any) => ({
                              value: model.name,
                              label: model.name
                            }))
                          ]}
                        />

                        <FormField
                          label="Biltype"
                          value={localFilters.body_type || 'all'}
                          onValueChange={(value) => handleFilterChange('body_type', value)}
                          placeholder="Alle biltyper"
                          size="lg"
                          options={[
                            { value: 'all', label: 'Alle biltyper' },
                            ...(referenceData?.bodyTypes?.map((bodyType: any) => ({
                              value: bodyType.name,
                              label: bodyType.name
                            })) || [])
                          ]}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ===== CALL-TO-ACTION BUTTON ===== */}
                {/* 16px top padding for separation from form fields */}
                <div className="pt-4">
                  {/* Primary Search Button - Large size (48px height), full width */}
                  <Button 
                    className="w-full font-bold tracking-wide h-10 md:h-12 text-sm md:text-base" 
                    onClick={handleSearch}
                    aria-label="Søg efter biler med de valgte kriterier"
                  >
                    Vis {resultCount} biler
                  </Button>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>

    </section>
  )
}

export default HeroBanner