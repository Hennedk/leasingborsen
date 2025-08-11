import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FilterOption {
  name: string
  label: string
}

interface ExpandableFilterChipsProps {
  label: string
  popularOptions: FilterOption[]
  remainingOptions: FilterOption[]
  selectedValues: string[]
  onToggle: (value: string) => void
  className?: string
}

/**
 * ExpandableFilterChips - Progressive disclosure for filter options
 * Shows popular options first with expandable "Show more" for remaining options
 */
export const ExpandableFilterChips: React.FC<ExpandableFilterChipsProps> = ({
  label,
  popularOptions,
  remainingOptions,
  selectedValues,
  onToggle,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Check if any hidden options are selected (auto-expand if so)
  const hasSelectedHidden = remainingOptions.some(option => 
    selectedValues.includes(option.name)
  )
  
  // Auto-expand if user has selected hidden types
  useEffect(() => {
    if (hasSelectedHidden && !isExpanded) {
      setIsExpanded(true)
    }
  }, [hasSelectedHidden, isExpanded])
  
  const remainingCount = remainingOptions.length
  
  const renderChip = (option: FilterOption, isSelected: boolean) => (
    <Badge
      key={option.name}
      variant={isSelected ? "default" : "outline"}
      className={cn(
        "cursor-pointer transition-all duration-200 px-3 py-1.5 text-xs font-medium",
        isSelected 
          ? "bg-gradient-to-r from-primary to-primary/90 text-white border-primary hover:from-primary/90 hover:to-primary/80" 
          : "hover:bg-muted/50 border-border hover:border-primary/50"
      )}
      onClick={() => onToggle(option.name)}
    >
      {option.label}
    </Badge>
  )
  
  return (
    <div className={cn('space-y-3', className)}>
      <Label className="text-sm font-medium text-foreground">
        {label}
      </Label>
      
      <div className="space-y-3">
        {/* Popular options - always visible */}
        <div className="flex flex-wrap gap-2">
          {popularOptions.map((option) => 
            renderChip(option, selectedValues.includes(option.name))
          )}
        </div>
        
        {/* Remaining options - behind progressive disclosure */}
        {isExpanded && (
          <div 
            className={cn(
              "flex flex-wrap gap-2",
              "animate-in slide-in-from-top-2 duration-200 ease-out"
            )}
          >
            {remainingOptions.map((option) => 
              renderChip(option, selectedValues.includes(option.name))
            )}
          </div>
        )}
        
        {/* Show more/less button */}
        {remainingCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              "h-auto p-0 text-muted-foreground hover:text-foreground hover:bg-transparent",
              "text-xs font-normal transition-colors duration-200"
            )}
            aria-expanded={isExpanded}
            aria-controls={`${label.toLowerCase().replace(/\s+/g, '-')}-additional-options`}
          >
            {isExpanded ? (
              <>
                Vis færre
                <ChevronUp className="w-3 h-3 ml-1" />
              </>
            ) : (
              <>
                Vis flere
                <ChevronDown className="w-3 h-3 ml-1" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}

ExpandableFilterChips.displayName = 'ExpandableFilterChips'