import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SortOrder, SortOption } from '@/types'

interface ListingsHeaderProps {
  resultCount: number
  sortOptions: SortOption[]
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
        Søgeresultater opdateret: {resultCount} {resultCount === 1 ? 'tilbud fundet' : 'tilbud fundet'}
      </div>
      
      {/* Main header row */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-foreground">
          {resultCount} {resultCount === 1 ? 'tilbud fundet' : 'tilbud fundet'}
        </h1>
        
        {/* Sort selector */}
        <div className="flex items-center gap-2 min-w-[200px]">
          <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
          <Select
            value={sortOrder}
            onValueChange={onSortChange}
          >
            <SelectTrigger
              size="default"
              background="primary"
              className="min-w-[180px]"
              aria-label="Sorter efter"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}

export default ListingsHeader