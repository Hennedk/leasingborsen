import React from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface MobileFilterSearchProps {
  searchTerm: string
  onSearchChange: (term: string) => void
  placeholder: string
  showSearch: boolean
  className?: string
}

/**
 * MobileFilterSearch - Reusable search input for mobile filters
 * 
 * Used across makes and models views with debounced search functionality
 */
export const MobileFilterSearch: React.FC<MobileFilterSearchProps> = React.memo(({
  searchTerm,
  onSearchChange,
  placeholder,
  showSearch,
  className = ''
}) => {
  if (!showSearch) return null

  return (
    <div className={`p-4 border-b bg-background ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 h-10"
          autoComplete="off"
        />
      </div>
    </div>
  )
})

MobileFilterSearch.displayName = 'MobileFilterSearch'