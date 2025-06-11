import React from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { useFilterStore } from '@/stores/filterStore'
import FilterSidebar from './FilterSidebar'
interface MobileFilterOverlayProps {
  isOpen: boolean
  onClose: () => void
  resultCount: number
}

const MobileFilterOverlay: React.FC<MobileFilterOverlayProps> = ({
  isOpen,
  onClose,
  resultCount
}) => {
  const { resetFilters, getActiveFilters } = useFilterStore()
  const activeFilters = getActiveFilters()
  
  const handleClearAll = () => {
    resetFilters()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden m-0 p-0 w-screen h-screen">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm m-0 p-0 w-full h-full"
        onClick={onClose}
      />
      
      {/* Mobile Overlay Container */}
      <div className="absolute inset-0 bg-background flex flex-col overflow-hidden w-full h-full m-0 p-0">
        {/* Mobile Filter Header - Fixed */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-border bg-background w-full">
          <div className="flex items-center justify-between w-full">
            <div>
              <h2 className="text-xl font-bold text-foreground">
                Filtrér
              </h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="hover:bg-muted h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Mobile Filter Content - Scrollable */}
        <div className="flex-1 overflow-y-auto overscroll-contain overflow-x-hidden w-full border-2 border-red-500">
          <FilterSidebar 
            isOpen={isOpen}
            onClose={onClose}
            className="w-full max-w-none [&>div]:shadow-none [&>div]:border-2 [&>div]:border-blue-500 [&>div]:bg-transparent [&>div]:w-full [&>div]:max-w-none [&>div>div:first-child]:hidden [&_[data-slot='card-content']]:!px-4 [&_[data-slot='card-content']]:!pt-8 [&_[data-slot='card-content']]:!pb-8 [&_[data-slot='card-content']]:!border-2 [&_[data-slot='card-content']]:!border-green-500 [&_[data-slot='card-content']]:w-full"
          />
        </div>
        
        {/* Mobile Filter Footer - Fixed */}
        <div className="flex-shrink-0 px-4 py-4 border-t border-border bg-background lg:hidden">
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={handleClearAll}
              disabled={activeFilters.length === 0}
              className="font-semibold"
              size="default"
            >
              Ryd alle
            </Button>
            <Button
              onClick={onClose}
              className="flex-1 font-semibold"
              size="default"
            >
              Vis {resultCount} {resultCount === 1 ? 'resultat' : 'resultater'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MobileFilterOverlay