import React from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ArrowUpDown, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SortOrder, SortOption } from '@/types'

interface ListingsHeaderProps {
  resultCount: number
  sortOptions: SortOption[]
  currentSortLabel: string
  sortOrder: SortOrder
  onSortChange: (order: SortOrder) => void
  className?: string
}

/**
 * Desktop header with result count and sorting controls
 * Extracted from main Listings component for better organization
 */
const ListingsHeader: React.FC<ListingsHeaderProps> = ({
  resultCount,
  sortOptions,
  currentSortLabel,
  sortOrder,
  onSortChange,
  className
}) => {
  return (
    <div className={cn("hidden lg:block mb-6", className)}>
      {/* Screen reader announcement */}
      <div 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
        id="results-announcement"
      >
        Søgeresultater opdateret: {resultCount} {resultCount === 1 ? 'bil fundet' : 'biler fundet'}
      </div>
      
      {/* Main header row */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-foreground">
          {resultCount} {resultCount === 1 ? 'bil fundet' : 'biler fundet'}
        </h1>
        
        {/* Sort dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 h-12 border-input focus:border-ring px-4 text-sm"
              aria-label={`Sorter efter: ${currentSortLabel}`}
            >
              <ArrowUpDown className="w-4 h-4" />
              <span>{currentSortLabel}</span>
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[180px]">
            {sortOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onSortChange(option.value)}
                className={cn(
                  "cursor-pointer",
                  sortOrder === option.value && "text-primary font-medium bg-muted"
                )}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

export default ListingsHeader