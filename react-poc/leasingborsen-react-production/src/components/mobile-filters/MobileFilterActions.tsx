import React from 'react'
import { Button } from '@/components/ui/button'

type MobileView = 'filters' | 'makes' | 'makeSelection' | 'models'

interface MobileFilterActionsProps {
  currentView: MobileView
  activeFiltersCount: number
  resultCount: number
  selectedMakesCount: number
  selectedModelsCount: number
  canProceed: boolean
  onClearAll: () => void
  onApply: () => void
  onViewChange: (view: MobileView) => void
}

/**
 * MobileFilterActions - Footer actions for mobile filter overlay
 * 
 * Handles CTA buttons, clear functionality, and view navigation
 */
export const MobileFilterActions: React.FC<MobileFilterActionsProps> = React.memo(({
  currentView,
  activeFiltersCount,
  resultCount,
  selectedMakesCount,
  selectedModelsCount,
  canProceed,
  onClearAll,
  onApply,
  onViewChange
}) => {
  const renderFilterViewActions = () => (
    <div className="p-4 border-t bg-background space-y-3">
      {/* Clear all button - only show if there are active filters */}
      {activeFiltersCount > 0 && (
        <Button
          variant="outline"
          onClick={onClearAll}
          className="w-full"
        >
          Ryd alle filtre ({activeFiltersCount})
        </Button>
      )}
      
      {/* Apply filters button */}
      <Button
        onClick={onApply}
        className="w-full"
        disabled={resultCount === 0}
      >
        Se {resultCount.toLocaleString('da-DK')} bil{resultCount !== 1 ? 'er' : ''}
      </Button>
    </div>
  )

  const renderMakesViewActions = () => (
    <div className="p-4 border-t bg-background">
      <Button
        onClick={() => onViewChange('makeSelection')}
        className="w-full"
        disabled={!canProceed}
      >
        Vælg {selectedMakesCount} mærke{selectedMakesCount !== 1 ? 'r' : ''}
      </Button>
    </div>
  )

  const renderMakeSelectionActions = () => (
    <div className="p-4 border-t bg-background">
      <Button
        onClick={() => onViewChange('filters')}
        className="w-full"
      >
        Tilbage til filtre
      </Button>
    </div>
  )

  const renderModelsViewActions = () => (
    <div className="p-4 border-t bg-background">
      <Button
        onClick={() => onViewChange('filters')}
        className="w-full"
      >
        Vælg {selectedModelsCount} model{selectedModelsCount !== 1 ? 'ler' : ''}
      </Button>
    </div>
  )

  switch (currentView) {
    case 'filters':
      return renderFilterViewActions()
    case 'makes':
      return renderMakesViewActions()
    case 'makeSelection':
      return renderMakeSelectionActions()
    case 'models':
      return renderModelsViewActions()
    default:
      return null
  }
})

MobileFilterActions.displayName = 'MobileFilterActions'