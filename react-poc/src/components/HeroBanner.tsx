import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, type FilterOptions, type Make, type Model, type BodyType } from '../lib/supabase'
import { Button } from './ui/button'

const HeroBanner: React.FC = () => {
  const navigate = useNavigate()
  
  // State management
  const [filters, setFilters] = useState<FilterOptions>({
    make: '',
    model: '',
    body_type: '',
    price_max: null
  })
  
  const [makes, setMakes] = useState<Make[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [bodyTypes, setBodyTypes] = useState<BodyType[]>([])
  const [resultCount, setResultCount] = useState(0)
  const [isMounted, setIsMounted] = useState(false)

  // Price steps for max price dropdown
  const priceSteps = Array.from({ length: 10 }, (_, i) => (i + 1) * 1000)

  // Filtered models based on selected make
  const filteredModels = useMemo(() => {
    if (!filters.make) return []
    const selectedMake = makes.find(make => make.name === filters.make)
    return models.filter(m => m.make_id === selectedMake?.id)
  }, [filters.make, makes, models])

  // Clean query parameters (only non-empty values)
  const queryParams = useMemo(() => {
    const cleanFilters: Record<string, string | number> = {}
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== '' && value !== null) {
        cleanFilters[key] = value
      }
    })
    return cleanFilters
  }, [filters])

  // Reset model when make changes
  useEffect(() => {
    setFilters(prev => ({ ...prev, model: '' }))
  }, [filters.make])

  // Fetch result count based on current filters
  const fetchCount = async () => {
    if (!isMounted) return
    
    try {
      let query = supabase.from('full_listing_view').select('*', { count: 'exact', head: true })
      
      if (filters.make) query = query.ilike('make', `%${filters.make}%`)
      if (filters.model) query = query.ilike('model', `%${filters.model}%`)
      if (filters.body_type) query = query.eq('body_type', filters.body_type)
      if (filters.price_max != null) query = query.lte('monthly_price', filters.price_max)

      const { count, error } = await query
      if (isMounted) {
        setResultCount(error ? 0 : count ?? 0)
      }
    } catch (e) {
      console.error('Count fetch failed:', e)
      if (isMounted) {
        setResultCount(0)
      }
    }
  }

  // Watch filters and fetch count
  useEffect(() => {
    fetchCount()
  }, [filters, isMounted])

  // Fetch data on mount
  useEffect(() => {
    setIsMounted(true)
    
    const fetchData = async () => {
      try {
        const [makesResult, modelsResult, bodyTypesResult] = await Promise.all([
          supabase.from('makes').select('*'),
          supabase.from('models').select('*'),
          supabase.from('body_types').select('*')
        ])

        if (makesResult.data) {
          setMakes(makesResult.data.sort((a, b) => a.name.localeCompare(b.name)))
        }
        if (modelsResult.data) {
          setModels(modelsResult.data)
        }
        if (bodyTypesResult.data) {
          setBodyTypes(bodyTypesResult.data)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }

    fetchData()

    return () => {
      setIsMounted(false)
    }
  }, [])

  // Navigation function
  const findCars = () => {
    navigate('/listings?' + new URLSearchParams(queryParams as Record<string, string>).toString())
  }

  // Handle filter changes
  const handleFilterChange = (key: keyof FilterOptions, value: string | number | null) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  return (
    <section className="hero min-h-[400px] lg:min-h-[600px] bg-gradient-to-br from-primary via-primary to-primary relative overflow-hidden w-full">
      {/* Enhanced Background decorative elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-black/20 to-black/40"></div>
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-white/5 via-white/2 to-transparent"></div>
      <div className="absolute bottom-0 left-0 w-1/3 h-1/2 bg-gradient-to-tr from-white/3 to-transparent"></div>
      <div className="absolute inset-0 bg-radial-gradient from-white/5 via-transparent to-transparent"></div>
      
      <div className="w-full">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-6 py-6 lg:py-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-12 w-full items-center">
            
            {/* LEFT SIDE: Promotional Text */}
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
                
                {/* Promotional Banner Image */}
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

            {/* RIGHT SIDE: Search Box */}
            <div className="order-2 lg:order-2 lg:col-span-2 animate-slide-in-right px-2 py-4 lg:p-0">
              <div className="bg-card backdrop-blur-md rounded-3xl shadow-2xl p-6 lg:p-8 w-full max-w-[95%] sm:max-w-lg lg:max-w-none mx-auto border border-border/50 space-y-6 lg:space-y-8 transition-all duration-500 ease-in hover:shadow-xl">
                <div className="space-y-3 lg:space-y-4">
                  <h2 className="text-xl lg:text-2xl font-bold text-card-foreground text-center lg:text-left leading-tight">
                    Søg blandt hundredvis af leasingbiler – find din drømmebil nu
                  </h2>
                  
                  <div className="space-y-4 lg:space-y-6">
                    {/* First Row: Make and Model */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                      {/* Make Dropdown */}
                      <div>
                        <label className="block text-sm font-semibold text-primary mb-2">
                          Mærke
                        </label>
                        <select
                          value={filters.make}
                          onChange={(e) => handleFilterChange('make', e.target.value)}
                          className="w-full p-3 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                        >
                          <option value="">Vælg mærke</option>
                          {makes.map(make => (
                            <option key={make.id} value={make.name}>
                              {make.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Model Dropdown */}
                      <div>
                        <label className="block text-sm font-semibold text-primary mb-2">
                          Model
                        </label>
                        <select
                          value={filters.model}
                          onChange={(e) => handleFilterChange('model', e.target.value)}
                          disabled={!filters.make}
                          className="w-full p-3 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50"
                        >
                          <option value="">
                            {filters.make ? 'Vælg model' : 'Vælg mærke først'}
                          </option>
                          {filteredModels.map(model => (
                            <option key={model.id} value={model.name}>
                              {model.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Second Row: Vehicle Type and Max Price */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                      {/* Vehicle Type Dropdown */}
                      <div>
                        <label className="block text-sm font-semibold text-primary mb-2">
                          Biltype
                        </label>
                        <select
                          value={filters.body_type}
                          onChange={(e) => handleFilterChange('body_type', e.target.value)}
                          className="w-full p-3 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                        >
                          <option value="">Alle biltyper</option>
                          {bodyTypes.map(bodyType => (
                            <option key={bodyType.name} value={bodyType.name}>
                              {bodyType.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Max Price Dropdown */}
                      <div>
                        <label className="block text-sm font-semibold text-primary mb-2">
                          Maks pris
                        </label>
                        <select
                          value={filters.price_max || ''}
                          onChange={(e) => handleFilterChange('price_max', e.target.value ? Number(e.target.value) : null)}
                          className="w-full p-3 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                        >
                          <option value="">Ingen grænse</option>
                          {priceSteps.map(p => (
                            <option key={`max-${p}`} value={p}>
                              {p.toLocaleString('da-DK')} kr./måned
                            </option>
                          ))}
                          <option value={9999999}>10.000+ kr./måned</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Primary CTA */}
                <Button 
                  onClick={findCars}
                  size="lg"
                  className="w-full shadow-xl hover:shadow-2xl font-bold tracking-wide"
                  aria-label="Søg efter biler med de valgte kriterier"
                >
                  Vis {resultCount} biler
                </Button>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </section>
  )
}

export default HeroBanner