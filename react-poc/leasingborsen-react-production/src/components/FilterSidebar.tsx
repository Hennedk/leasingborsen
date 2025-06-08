import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { X, Filter, RotateCcw } from 'lucide-react'
import { useFilterStore } from '@/stores/filterStore'
import { useReferenceData } from '@/hooks/useReferenceData'
import { useListingCount } from '@/hooks/useListings'

interface FilterSidebarProps {
  isOpen?: boolean
  onClose?: () => void
  className?: string
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({ 
  isOpen = true, 
  onClose, 
  className = '' 
}) => {
  const { 
    make, 
    model, 
    body_type, 
    price_max,
    setFilter, 
    resetFilters 
  } = useFilterStore()
  
  const { data: referenceData } = useReferenceData()
  const { data: countData } = useListingCount({ make, model, body_type, price_max })
  const resultCount = countData?.data || 0

  // Price steps for filtering
  const priceSteps = Array.from({ length: 10 }, (_, i) => (i + 1) * 1000)
  
  // Get filtered models based on selected make
  const filteredModels = React.useMemo(() => {
    if (!make || !referenceData?.models) return []
    const selectedMake = referenceData.makes?.find((m: any) => m.name === make)
    return referenceData.models.filter((m: any) => m.make_id === selectedMake?.id) || []
  }, [make, referenceData])

  // Active filters count
  const activeFiltersCount = [make, model, body_type, price_max].filter(Boolean).length

  const handleFilterChange = (key: string, value: any) => {
    const filterValue = value === 'all' ? (key === 'price_max' ? null : '') : value
    if (key === 'price_max' && value !== 'all') {
      setFilter(key as any, parseInt(value))
    } else {
      setFilter(key as any, filterValue)
    }
  }

  const handleClearFilter = (key: string) => {
    setFilter(key as any, key === 'price_max' ? null : '')
  }

  const handleResetAllFilters = () => {
    resetFilters()
  }

  return (
    <div className={`${className} ${isOpen ? 'block' : 'hidden'}`}>
      <Card className="bg-card border border-border shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg font-semibold">
                Filtrér søgning
              </CardTitle>
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFiltersCount}
                </Badge>
              )}
            </div>
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="md:hidden"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          {activeFiltersCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetAllFilters}
              className="w-full mt-2"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Nulstil alle filtre
            </Button>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Make Filter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="font-medium">Mærke</Label>
              {make && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleClearFilter('make')}
                  className="h-auto p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
            <Select value={make || 'all'} onValueChange={(value) => handleFilterChange('make', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Vælg mærke" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle mærker</SelectItem>
                {referenceData?.makes?.map((makeItem: any) => (
                  <SelectItem key={makeItem.id} value={makeItem.name}>
                    {makeItem.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Model Filter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="font-medium">Model</Label>
              {model && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleClearFilter('model')}
                  className="h-auto p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
            <Select 
              value={model || 'all'} 
              onValueChange={(value) => handleFilterChange('model', value)}
              disabled={!make}
            >
              <SelectTrigger>
                <SelectValue 
                  placeholder={make ? 'Vælg model' : 'Vælg mærke først'} 
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle modeller</SelectItem>
                {filteredModels.map((modelItem: any) => (
                  <SelectItem key={modelItem.id} value={modelItem.name}>
                    {modelItem.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Body Type Filter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="font-medium">Biltype</Label>
              {body_type && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleClearFilter('body_type')}
                  className="h-auto p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
            <Select value={body_type || 'all'} onValueChange={(value) => handleFilterChange('body_type', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Alle biltyper" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle biltyper</SelectItem>
                {referenceData?.bodyTypes?.map((bodyTypeItem: any) => (
                  <SelectItem key={bodyTypeItem.name} value={bodyTypeItem.name}>
                    {bodyTypeItem.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Max Price Filter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="font-medium">Maksimal pris</Label>
              {price_max && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleClearFilter('price_max')}
                  className="h-auto p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
            <Select 
              value={price_max?.toString() || 'all'} 
              onValueChange={(value) => handleFilterChange('price_max', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Ingen grænse" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Ingen grænse</SelectItem>
                {priceSteps.map((price) => (
                  <SelectItem key={price} value={price.toString()}>
                    Op til {price.toLocaleString('da-DK')} kr./måned
                  </SelectItem>
                ))}
                <SelectItem value="9999999">10.000+ kr./måned</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Active Filters Display */}
          {activeFiltersCount > 0 && (
            <div className="space-y-3">
              <Label className="font-medium">Aktive filtre:</Label>
              <div className="flex flex-wrap gap-2">
                {make && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Mærke: {make}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleClearFilter('make')}
                      className="h-auto p-0 ml-1 hover:bg-transparent"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                )}
                {model && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Model: {model}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleClearFilter('model')}
                      className="h-auto p-0 ml-1 hover:bg-transparent"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                )}
                {body_type && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Type: {body_type}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleClearFilter('body_type')}
                      className="h-auto p-0 ml-1 hover:bg-transparent"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                )}
                {price_max && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Max: {price_max.toLocaleString('da-DK')} kr
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleClearFilter('price_max')}
                      className="h-auto p-0 ml-1 hover:bg-transparent"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Results Count */}
          <div className="pt-4 border-t border-border">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Søgeresultater
              </p>
              <Badge variant="outline" className="text-lg font-semibold px-4 py-2">
                {resultCount} biler fundet
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default FilterSidebar