import React from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

type MobileView = 'filters' | 'makes' | 'makeSelection' | 'models'

interface Make {
  id: string
  name: string
  models?: Model[]
}

interface Model {
  id: string
  name: string
  make_id: string
}

interface MobileFilterCategoriesProps {
  currentView: MobileView
  // Makes data
  popularMakes: Make[]
  otherMakes: Make[]
  selectedMakes: string[]
  onMakeToggle: (makeName: string) => void
  // Models data
  models: Model[]
  selectedModels: string[]
  onModelToggle: (modelName: string) => void
  // Make selection
  onMakeSelect: (makeName: string) => void
  // Data loading
  isLoading?: boolean
  className?: string
}

/**
 * MobileFilterCategories - Makes and models selection views
 * 
 * Handles the display and interaction for make/model selection across different views
 */
export const MobileFilterCategories: React.FC<MobileFilterCategoriesProps> = React.memo(({
  currentView,
  popularMakes,
  otherMakes,
  selectedMakes,
  onMakeToggle,
  models,
  selectedModels,
  onModelToggle,
  onMakeSelect,
  isLoading = false,
  className = ''
}) => {
  if (currentView !== 'makes' && currentView !== 'makeSelection' && currentView !== 'models') {
    return null
  }

  const renderMakesView = () => (
    <div className="flex-1 overflow-y-auto min-h-0">
      <div className="p-4 space-y-4">
        {/* Popular Makes */}
        {popularMakes.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Populære mærker</h4>
            <div className="space-y-2">
              {popularMakes.map((make) => {
                const isSelected = selectedMakes.includes(make.name)
                return (
                  <div 
                    key={`mobile-popular-make-${make.id}`} 
                    className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-lg"
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onMakeToggle(make.name)}
                    />
                    <span className="text-sm font-medium flex-1">{make.name}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
        
        {/* Other Makes */}
        {otherMakes.length > 0 && (
          <div className="space-y-2">
            {popularMakes.length > 0 && <Separator />}
            <h4 className="text-sm font-medium text-muted-foreground">Andre mærker</h4>
            <div className="space-y-2">
              {otherMakes.map((make) => {
                const isSelected = selectedMakes.includes(make.name)
                return (
                  <div 
                    key={`mobile-other-make-${make.id}`} 
                    className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-lg"
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onMakeToggle(make.name)}
                    />
                    <span className="text-sm font-medium flex-1">{make.name}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="text-muted-foreground">Indlæser mærker...</div>
          </div>
        )}

        {/* No results */}
        {!isLoading && popularMakes.length === 0 && otherMakes.length === 0 && (
          <div className="flex justify-center py-8">
            <div className="text-muted-foreground">Ingen mærker fundet</div>
          </div>
        )}
      </div>
    </div>
  )

  const renderMakeSelectionView = () => (
    <div className="flex-1 overflow-y-auto min-h-0">
      <div className="p-4 space-y-4">
        <p className="text-sm text-muted-foreground">
          Vælg et mærke for at se tilgængelige modeller, eller gå tilbage til filtre.
        </p>
        
        <div className="space-y-2">
          {selectedMakes.map((makeName) => {
            // Find the make object to get model count
            const makeObj = [...popularMakes, ...otherMakes].find(m => m.name === makeName)
            const modelCount = makeObj?.models?.length || 0
            
            return (
              <div 
                key={`selected-make-${makeName}`}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="font-medium">{makeName}</div>
                  <div className="text-sm text-muted-foreground">
                    {modelCount} model{modelCount !== 1 ? 'ler' : ''}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onMakeSelect(makeName)}
                  className="ml-3"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Vælg modeller
                </Button>
              </div>
            )
          })}
        </div>

        {selectedMakes.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Ingen mærker valgt
          </div>
        )}
      </div>
    </div>
  )

  const renderModelsView = () => (
    <div className="flex-1 overflow-y-auto min-h-0">
      <div className="p-4 space-y-4">
        {models.length > 0 ? (
          <div className="space-y-2">
            {models.map((model) => {
              const isSelected = selectedModels.includes(model.name)
              return (
                <div 
                  key={`mobile-model-${model.id}`} 
                  className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-lg"
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onModelToggle(model.name)}
                  />
                  <span className="text-sm font-medium flex-1">{model.name}</span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            {isLoading ? 'Indlæser modeller...' : 'Ingen modeller fundet'}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className={`flex-1 flex flex-col min-h-0 ${className}`}>
      {currentView === 'makes' && renderMakesView()}
      {currentView === 'makeSelection' && renderMakeSelectionView()}
      {currentView === 'models' && renderModelsView()}
    </div>
  )
})

MobileFilterCategories.displayName = 'MobileFilterCategories'