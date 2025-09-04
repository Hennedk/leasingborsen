import React from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Plus, ChevronRight, ArrowLeft } from 'lucide-react'
import { useDebouncedSearch } from '@/hooks/useDebounce'
import type { Make, Model } from '@/types'

interface MakeModelSelectorProps {
  // Data
  makes: Make[]
  getModelsForMake: (makeName: string) => Model[]
  popularMakes: readonly string[]
  
  // Selected values
  selectedMakes: string[]
  selectedModels: string[]
  
  // Handlers
  onMakeToggle: (makeName: string) => void
  onModelToggle: (modelName: string) => void
  
  // Styling
  className?: string
}

/**
 * MakeModelSelector - Reusable make and model selection component
 * 
 * Handles both make and model selection with search functionality
 */
export const MakeModelSelector: React.FC<MakeModelSelectorProps> = ({
  makes,
  getModelsForMake,
  popularMakes,
  selectedMakes,
  selectedModels,
  onMakeToggle,
  onModelToggle,
  className = ''
}) => {
  // Dialog states
  const [makeModalOpen, setMakeModalOpen] = React.useState(false)
  const [modelModalOpen, setModelModalOpen] = React.useState(false)
  
  // Search states
  const { searchTerm: makeSearch, debouncedSearchTerm: debouncedMakeSearch, setSearchTerm: setMakeSearch } = useDebouncedSearch()
  const { searchTerm: modelSearch, debouncedSearchTerm: debouncedModelSearch, setSearchTerm: setModelSearch } = useDebouncedSearch()
  
  // Model selection state (for multiple makes flow)
  const [selectedMakeForModels, setSelectedMakeForModels] = React.useState<string | null>(null)
  const [modelSelectionView, setModelSelectionView] = React.useState<'makeSelection' | 'models'>('makeSelection')

  // Filter makes for search
  const filteredMakes = React.useMemo(() => {
    if (!debouncedMakeSearch) return makes
    return makes.filter((make: Make) => 
      make.name.toLowerCase().includes(debouncedMakeSearch.toLowerCase())
    )
  }, [makes, debouncedMakeSearch])
  
  // Separate popular and other makes for display
  const popularMakesList = filteredMakes.filter((make: Make) => popularMakes.includes(make.name))
  const otherMakesList = filteredMakes.filter((make: Make) => !popularMakes.includes(make.name))

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Make Filter - Modal Selector */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground">Mærke</Label>
        
        <Dialog open={makeModalOpen} onOpenChange={setMakeModalOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between border text-sm font-normal"
              size="md"
            >
              {selectedMakes.length > 0 
                ? `${selectedMakes.length} ${selectedMakes.length === 1 ? 'mærke' : 'mærker'} valgt`
                : 'Vælg mærker'
              }
              <Plus className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Vælg bilmærker</DialogTitle>
              <DialogDescription>
                Vælg et eller flere bilmærker for at filtrere søgeresultaterne.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <Input
                placeholder="Søg mærker..."
                value={makeSearch}
                onChange={(e) => setMakeSearch(e.target.value)}
                size="md"
                background="primary"
              />
              
              <ScrollArea className="h-80">
                <div className="space-y-4">
                  {/* Popular Makes */}
                  {popularMakesList.length > 0 && (
                    <div className="space-y-2">
                      <div className="bg-surface-alt px-3 py-1.5 -mx-2 mb-2 rounded-sm">
                        <h4 className="text-sm font-medium text-muted-foreground">Populære mærker</h4>
                      </div>
                      <div className="space-y-2">
                        {popularMakesList.map((make: Make) => {
                          const isSelected = selectedMakes.includes(make.name)
                          return (
                            <div key={`make-popular-${make.id}`} className="flex items-center space-x-2">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => onMakeToggle(make.name)}
                                className="h-5 w-5"
                              />
                              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                {make.name}
                              </label>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Other Makes */}
                  {otherMakesList.length > 0 && (
                    <div className="space-y-2">
                      {popularMakesList.length > 0 && <Separator />}
                      <div className="bg-surface-alt px-3 py-1.5 -mx-2 mb-2 rounded-sm">
                        <h4 className="text-sm font-medium text-muted-foreground">Andre mærker</h4>
                      </div>
                      <div className="space-y-2">
                        {otherMakesList.map((make: Make) => {
                          const isSelected = selectedMakes.includes(make.name)
                          return (
                            <div key={`make-other-${make.id}`} className="flex items-center space-x-2">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => onMakeToggle(make.name)}
                                className="h-5 w-5"
                              />
                              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                {make.name}
                              </label>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Model Filter - Modal Selector */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground">Model</Label>
        
        <Dialog open={modelModalOpen} onOpenChange={(open) => {
          setModelModalOpen(open)
          if (open) {
            // Reset view state when opening
            if (selectedMakes.length === 1) {
              setSelectedMakeForModels(selectedMakes[0])
              setModelSelectionView('models')
            } else {
              setSelectedMakeForModels(null)
              setModelSelectionView('makeSelection')
            }
            setModelSearch('')
          }
        }}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between border text-sm font-normal"
              size="md"
              disabled={selectedMakes.length === 0}
            >
              {selectedMakes.length === 0 
                ? 'Vælg mærker først'
                : selectedModels.length > 0 
                  ? `${selectedModels.length} ${selectedModels.length === 1 ? 'model' : 'modeller'} valgt`
                  : 'Vælg modeller'
              }
              <Plus className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            {modelSelectionView === 'makeSelection' ? (
              // Make Selection View (for multiple makes)
              <>
                <DialogHeader>
                  <DialogTitle>Vælg mærke</DialogTitle>
                  <DialogDescription>
                    Vælg hvilket mærke du vil se modeller for.
                  </DialogDescription>
                </DialogHeader>
                
                <ScrollArea className="h-80">
                  <div className="space-y-2">
                    {selectedMakes.map((makeName: string) => {
                      const makeModels = getModelsForMake(makeName)
                      const selectedModelsForMake = makeModels.filter(model => selectedModels.includes(model.name))
                      const selectedModelCount = selectedModelsForMake.length
                      const modelCount = makeModels.length
                      
                      return (
                        <Button
                          key={makeName}
                          variant="outline"
                          className="w-full justify-between h-auto p-2"
                          onClick={() => {
                            setSelectedMakeForModels(makeName)
                            setModelSelectionView('models')
                            setModelSearch('')
                          }}
                        >
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{makeName}</span>
                            <span className="text-sm text-muted-foreground">
                              {selectedModelCount > 0 
                                ? `${selectedModelCount} af ${modelCount} ${modelCount === 1 ? 'model' : 'modeller'} valgt`
                                : `${modelCount} ${modelCount === 1 ? 'model' : 'modeller'} tilgængelige`
                              }
                            </span>
                          </div>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      )
                    })}
                  </div>
                </ScrollArea>
              </>
            ) : (
              // Model Selection View (for specific make)
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setModelSelectionView('makeSelection')}
                      className="p-0 h-auto"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                      <DialogTitle>{selectedMakeForModels}</DialogTitle>
                      <DialogDescription className="text-left">
                        Vælg modeller
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                
                <div className="space-y-4">
                  <Input
                    placeholder="Søg modeller..."
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    size="md"
                    background="primary"
                  />
                  
                  <ScrollArea className="h-80">
                    <div className="space-y-2">
                      {selectedMakeForModels && getModelsForMake(selectedMakeForModels)
                        .filter((model: Model) => 
                          !debouncedModelSearch || model.name.toLowerCase().includes(debouncedModelSearch.toLowerCase())
                        )
                        .map((model: Model) => {
                          const isSelected = selectedModels.includes(model.name)
                          return (
                            <div key={`model-${model.id}`} className="flex items-center space-x-2">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => onModelToggle(model.name)}
                                className="h-5 w-5"
                              />
                              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                {model.name}
                              </label>
                            </div>
                          )
                        })
                      }
                    </div>
                  </ScrollArea>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

MakeModelSelector.displayName = 'MakeModelSelector'