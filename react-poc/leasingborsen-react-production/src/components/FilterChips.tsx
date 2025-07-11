import React, { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FilterChip } from '@/types'

interface FilterChipsProps {
  activeFilters: FilterChip[]
  onRemoveFilter: (key: string) => void
  onResetFilters: () => void
  className?: string
  showPlaceholder?: boolean
}

const FilterChipsComponent: React.FC<FilterChipsProps> = ({
  activeFilters,
  onRemoveFilter,
  onResetFilters,
  className = '',
  showPlaceholder = true
}) => {
  const [isVisible, setIsVisible] = useState(true)
  const [animatingOut, setAnimatingOut] = useState<string[]>([])
  const [lastRemovedFilter, setLastRemovedFilter] = useState<string | null>(null)

  const hasActiveFilters = activeFilters.length > 0

  const handleRemoveFilter = (key: string) => {
    // Find the filter label for accessibility announcement
    const filter = activeFilters.find(f => f.key === key)
    setLastRemovedFilter(filter?.label || '')
    
    // Add to animating out list
    setAnimatingOut(prev => [...prev, key])
    
    // Remove after animation
    setTimeout(() => {
      onRemoveFilter(key)
      setAnimatingOut(prev => prev.filter(k => k !== key))
      // Clear announcement after a short delay
      setTimeout(() => setLastRemovedFilter(null), 1000)
    }, 200)
  }

  // Show placeholder when no active filters
  useEffect(() => {
    setIsVisible(hasActiveFilters || showPlaceholder)
  }, [hasActiveFilters, showPlaceholder])

  if (!isVisible) return null

  return (
    <div className={cn(
      'filter-chips-container flex items-center gap-2 transition-all duration-300',
      className
    )}>
      {/* Live region for filter announcements */}
      <div 
        aria-live="polite" 
        aria-atomic="false" 
        className="sr-only"
        id="filter-announcements"
      >
        {lastRemovedFilter && `Filter fjernet: ${lastRemovedFilter}`}
      </div>
      {/* Placeholder when no filters */}
      {!hasActiveFilters && showPlaceholder && (
        <div className="animate-in fade-in duration-300">
          <Badge 
            variant="secondary" 
            className="text-sm bg-muted/50 text-muted-foreground border-muted-foreground/20 px-3 py-1.5"
          >
            Ingen filtre anvendt
          </Badge>
        </div>
      )}

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 animate-in fade-in duration-300">
          {activeFilters.map((filter) => {
            const isAnimatingOut = animatingOut.includes(filter.key)
            
            return (
              <div
                key={filter.key}
                className={cn(
                  'transition-all duration-200 ease-out flex-shrink-0',
                  isAnimatingOut 
                    ? 'animate-out fade-out slide-out-to-right-2 scale-95' 
                    : 'animate-in fade-in slide-in-from-left-2 scale-100'
                )}
              >
                <Badge 
                  variant="secondary" 
                  className="flex items-center gap-2 px-3 !py-0 bg-card border hover:bg-muted/50 transition-colors duration-200 shadow-sm whitespace-nowrap h-8"
                >
                  <span className="text-sm font-medium text-foreground">
                    {filter.label}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFilter(filter.key)}
                    className="h-4 w-4 p-0 hover:bg-destructive/20 hover:text-destructive transition-colors duration-200 rounded-full"
                    aria-label={`Fjern filter: ${filter.label}`}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              </div>
            )
          })}
          
          {/* Reset all filters button */}
          {activeFilters.length > 1 && (
            <div className="animate-in fade-in duration-300 delay-100 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={onResetFilters}
                className="h-8 px-3 text-xs hover:bg-destructive/10 hover:text-destructive transition-colors duration-200 whitespace-nowrap"
              >
                <RotateCcw className="w-3 h-3 mr-1.5" />
                Nulstil alle
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const FilterChips = React.memo(FilterChipsComponent)
export default FilterChips