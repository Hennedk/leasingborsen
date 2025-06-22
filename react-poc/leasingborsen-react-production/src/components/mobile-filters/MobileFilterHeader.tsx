import React from 'react'
import { ChevronLeft, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

type MobileView = 'filters' | 'makes' | 'makeSelection' | 'models'

interface MobileFilterHeaderProps {
  currentView: MobileView
  activeFiltersCount: number
  selectedMakeForModels?: string | null
  onBack: () => void
  onClose: () => void
  canGoBack?: boolean
}

/**
 * MobileFilterHeader - Header component for mobile filter overlay
 * 
 * Handles navigation, titles, and filter count badge across different views
 */
export const MobileFilterHeader: React.FC<MobileFilterHeaderProps> = React.memo(({
  currentView,
  activeFiltersCount,
  selectedMakeForModels,
  onBack,
  onClose,
  canGoBack = false
}) => {
  const getTitle = (): string => {
    switch (currentView) {
      case 'makes':
        return 'Vælg mærker'
      case 'makeSelection':
        return 'Valgte mærker'
      case 'models':
        return selectedMakeForModels ? `${selectedMakeForModels} modeller` : 'Vælg modeller'
      default:
        return 'Filtrér'
    }
  }

  const showBackButton = canGoBack && currentView !== 'filters'
  const showFilterBadge = currentView === 'filters' && activeFiltersCount > 0

  return (
    <div className="flex items-center justify-between p-4 border-b bg-background">
      <div className="flex items-center gap-3">
        {showBackButton ? (
          <button
            onClick={onBack}
            className="p-1 hover:bg-accent rounded transition-colors"
            aria-label="Gå tilbage"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        ) : (
          <div className="w-7" /> // Spacer for alignment
        )}
        
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{getTitle()}</h2>
          {showFilterBadge && (
            <Badge variant="secondary" className="h-6 min-w-6 px-2">
              {activeFiltersCount}
            </Badge>
          )}
        </div>
      </div>

      <button
        onClick={onClose}
        className="p-1 hover:bg-accent rounded transition-colors"
        aria-label="Luk filtre"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  )
})

MobileFilterHeader.displayName = 'MobileFilterHeader'