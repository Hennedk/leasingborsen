import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFilterStore } from '@/stores/consolidatedFilterStore'
import { useReferenceData } from '@/hooks/useReferenceData'
import { useListingCount } from '@/hooks/useListings'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { FILTER_CONFIG } from '@/config/filterConfig'

interface SearchFormProps {
  className?: string
  size?: 'default' | 'compact'
}

const SearchForm: React.FC<SearchFormProps> = ({ 
  className = '', 
  size = 'default' 
}) => {
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
    if (!localFilters.make || localFilters.make === 'all' || !referenceData?.models) return []
    const selectedMake = referenceData.makes?.find((m: { name: string; id: string }) => m.name === localFilters.make)
    return referenceData.models.filter((m: { name: string; make_id: string }) => m.make_id === selectedMake?.id) || []
  }, [localFilters.make, referenceData])

  // Organize makes with popular ones first
  const organizedMakes = useMemo(() => {
    if (!referenceData?.makes) return { popular: [], remaining: [] }
    
    const popular = referenceData.makes.filter((make: { name: string; id: string }) => 
      FILTER_CONFIG.POPULAR_MAKES.includes(make.name as any)
    )
    const remaining = referenceData.makes.filter((make: { name: string; id: string }) => 
      !FILTER_CONFIG.POPULAR_MAKES.includes(make.name as any)
    )
    
    return { popular, remaining }
  }, [referenceData?.makes])

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

  const handleFilterChange = (key: string, value: string | number) => {
    const filterValue = value === 'all' ? (key === 'price_max' ? null : '') : value
    const actualValue = key === 'price_max' && value !== 'all' ? parseInt(value.toString()) : filterValue
    
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

  const handleMoreFilters = () => {
    // Apply current filters to global state
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
    
    // Navigate to listings with filters and show filter overlay on mobile
    const searchParams = new URLSearchParams()
    Object.entries(localFilters).forEach(([key, value]) => {
      if (value && value !== '' && value !== null) {
        searchParams.set(key, value.toString())
      }
    })
    
    // Add parameter to show filter overlay on mobile
    searchParams.set('showFilters', 'true')
    
    navigate(`/listings?${searchParams.toString()}`)
  }

  const cardPadding = size === 'compact' ? 'p-4' : 'p-6'
  const spacing = size === 'compact' ? 'space-y-4' : 'space-y-5'

  return (
    <Card className={`bg-white border border-border/40 hover:border-primary/40 transition-all duration-300 rounded-2xl overflow-hidden shadow-lg ${className}`}>
      <CardContent className={`${cardPadding} ${spacing}`}>
        
        
        {/* Form Fields Container */}
        <div className="space-y-4">
          
          {/* Top Row: Make & Model */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Select 
                value={localFilters.make || 'all'}
                onValueChange={(value) => handleFilterChange('make', value)}
              >
                <SelectTrigger className="h-12 text-sm border-input focus:border-ring justify-between bg-background text-foreground px-4">
                  <SelectValue placeholder="Vælg mærke" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle mærker</SelectItem>
                  
                  {/* Popular makes section */}
                  {organizedMakes.popular.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50">
                        Mest populære
                      </div>
                      {organizedMakes.popular.map((make: { name: string; id: string }) => (
                        <SelectItem key={make.id} value={make.name}>{make.name}</SelectItem>
                      ))}
                    </>
                  )}
                  
                  {/* Remaining makes section */}
                  {organizedMakes.remaining.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50">
                        Alle mærker
                      </div>
                      {organizedMakes.remaining.map((make: { name: string; id: string }) => (
                        <SelectItem key={make.id} value={make.name}>{make.name}</SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select 
                value={localFilters.model || 'all'}
                onValueChange={(value) => handleFilterChange('model', value)}
                disabled={!localFilters.make || localFilters.make === 'all'}
              >
                <SelectTrigger className={`h-12 text-sm border-input focus:border-ring justify-between px-4 ${
                  !localFilters.make || localFilters.make === 'all' 
                    ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                    : 'bg-background text-foreground'
                }`} disabled={!localFilters.make || localFilters.make === 'all'}>
                  <SelectValue placeholder={localFilters.make && localFilters.make !== 'all' ? "Vælg model" : "Vælg mærke først"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle modeller</SelectItem>
                  {filteredModels.map((model: { name: string; make_id: string }) => (
                    <SelectItem key={model.name} value={model.name}>{model.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Bottom Row: Body Type & Max Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Select 
                value={localFilters.body_type || 'all'}
                onValueChange={(value) => handleFilterChange('body_type', value)}
              >
                <SelectTrigger className="h-12 text-sm border-input focus:border-ring justify-between bg-background text-foreground px-4">
                  <SelectValue placeholder="Vælg biltype" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle biltyper</SelectItem>
                  {referenceData?.bodyTypes?.map((bodyType: { name: string; id?: string }) => (
                    <SelectItem key={bodyType.id || bodyType.name} value={bodyType.name}>
                      {bodyType.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select 
                value={localFilters.price_max?.toString() || 'all'}
                onValueChange={(value) => handleFilterChange('price_max', value)}
              >
                <SelectTrigger className="h-12 text-sm border-input focus:border-ring justify-between bg-background text-foreground px-4">
                  <SelectValue placeholder="Vælg maks pris" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle priser</SelectItem>
                  {priceSteps.map((price) => (
                    <SelectItem key={price} value={price.toString()}>
                      Op til {price.toLocaleString('da-DK')} kr./md
                    </SelectItem>
                  ))}
                  <SelectItem value="9999999">Over 10.000 kr./md</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Call-to-Action Button */}
        <Button 
          className="w-full h-12 text-base font-semibold" 
          size="lg"
          onClick={handleSearch}
          aria-label="Søg efter biler med de valgte kriterier"
        >
          Vis {resultCount.toLocaleString('da-DK')} tilbud
        </Button>

        {/* Additional Filter Link */}
        <div className="flex items-center justify-center">
          <button 
            className="text-primary hover:text-primary/80 text-sm font-medium flex items-center gap-2 transition-colors"
            onClick={handleMoreFilters}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Flere filtre
          </button>
        </div>
      </CardContent>
    </Card>
  )
}

export default SearchForm