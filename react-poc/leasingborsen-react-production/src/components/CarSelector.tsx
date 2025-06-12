import React, { useState, useMemo, useCallback, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Search, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Car,
  RotateCcw
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Types
export interface CarMake {
  id: string
  name: string
  isPopular?: boolean
}

export interface CarModel {
  id: string
  name: string
  makeId: string
  makeName: string
}

export interface CarSelection {
  makeId: string
  makeName: string
  models: CarModel[]
}

export interface CarSelectorProps {
  makes: CarMake[]
  models: CarModel[]
  selectedCars: CarSelection[]
  onSelectionChange: (selections: CarSelection[]) => void
  maxSelections?: number
  placeholder?: string
  disabled?: boolean
  className?: string
}

type ViewMode = 'makes' | 'models'

interface ViewState {
  mode: ViewMode
  selectedMakeId?: string
  selectedMakeName?: string
}

const CarSelector: React.FC<CarSelectorProps> = ({
  makes,
  models,
  selectedCars,
  onSelectionChange,
  maxSelections,
  placeholder = "Vælg biler",
  disabled = false,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewState, setViewState] = useState<ViewState>({ mode: 'makes' })

  // Computed values
  const popularMakes = useMemo(() => 
    makes.filter(make => make.isPopular).sort((a, b) => a.name.localeCompare(b.name)),
    [makes]
  )

  const otherMakes = useMemo(() => 
    makes.filter(make => !make.isPopular).sort((a, b) => a.name.localeCompare(b.name)),
    [makes]
  )

  const filteredMakes = useMemo(() => {
    const searchLower = searchTerm.toLowerCase()
    const filterMakes = (makesList: CarMake[]) => 
      makesList.filter(make => make.name.toLowerCase().includes(searchLower))
    
    return {
      popular: filterMakes(popularMakes),
      other: filterMakes(otherMakes)
    }
  }, [popularMakes, otherMakes, searchTerm])

  const currentMakeModels = useMemo(() => {
    if (viewState.mode !== 'models' || !viewState.selectedMakeId) return []
    
    const makeModels = models.filter(model => model.makeId === viewState.selectedMakeId)
    const searchLower = searchTerm.toLowerCase()
    
    return makeModels.filter(model => 
      model.name.toLowerCase().includes(searchLower)
    ).sort((a, b) => a.name.localeCompare(b.name))
  }, [models, viewState, searchTerm])

  const selectedMakeIds = useMemo(() => 
    selectedCars.map(selection => selection.makeId),
    [selectedCars]
  )

  const totalSelectedModels = useMemo(() => 
    selectedCars.reduce((total, selection) => total + selection.models.length, 0),
    [selectedCars]
  )

  // Event handlers
  const handleMakeToggle = useCallback((make: CarMake) => {
    const isSelected = selectedMakeIds.includes(make.id)
    
    if (isSelected) {
      // Remove make and all its models
      onSelectionChange(selectedCars.filter(selection => selection.makeId !== make.id))
    } else {
      // Add make with no models initially
      const newSelection: CarSelection = {
        makeId: make.id,
        makeName: make.name,
        models: []
      }
      onSelectionChange([...selectedCars, newSelection])
    }
  }, [selectedCars, selectedMakeIds, onSelectionChange])

  const handleMakeDrillDown = useCallback((make: CarMake) => {
    setViewState({
      mode: 'models',
      selectedMakeId: make.id,
      selectedMakeName: make.name
    })
    setSearchTerm('')
  }, [])

  const handleModelToggle = useCallback((model: CarModel) => {
    const selectionIndex = selectedCars.findIndex(s => s.makeId === model.makeId)
    if (selectionIndex === -1) return

    const currentSelection = selectedCars[selectionIndex]
    const modelIndex = currentSelection.models.findIndex(m => m.id === model.id)
    
    let updatedModels: CarModel[]
    if (modelIndex >= 0) {
      // Remove model
      updatedModels = currentSelection.models.filter(m => m.id !== model.id)
    } else {
      // Add model (check max selections)
      if (maxSelections && totalSelectedModels >= maxSelections) return
      updatedModels = [...currentSelection.models, model]
    }

    const updatedSelection: CarSelection = {
      ...currentSelection,
      models: updatedModels
    }

    const newSelections = [...selectedCars]
    newSelections[selectionIndex] = updatedSelection
    onSelectionChange(newSelections)
  }, [selectedCars, onSelectionChange, totalSelectedModels, maxSelections])

  const handleBackToMakes = useCallback(() => {
    setViewState({ mode: 'makes' })
    setSearchTerm('')
  }, [])

  const handleClearAll = useCallback(() => {
    onSelectionChange([])
  }, [onSelectionChange])

  const handleRemoveSelection = useCallback((makeId: string, modelId?: string) => {
    if (modelId) {
      // Remove specific model
      const updatedSelections = selectedCars.map(selection => {
        if (selection.makeId === makeId) {
          return {
            ...selection,
            models: selection.models.filter(m => m.id !== modelId)
          }
        }
        return selection
      })
      onSelectionChange(updatedSelections)
    } else {
      // Remove entire make
      onSelectionChange(selectedCars.filter(selection => selection.makeId !== makeId))
    }
  }, [selectedCars, onSelectionChange])

  // Get selected model for current make in models view
  const getSelectedModelsForCurrentMake = useCallback(() => {
    if (viewState.mode !== 'models' || !viewState.selectedMakeId) return []
    
    const selection = selectedCars.find(s => s.makeId === viewState.selectedMakeId)
    return selection?.models || []
  }, [selectedCars, viewState])

  // Reset view when closing
  useEffect(() => {
    if (!isOpen) {
      setViewState({ mode: 'makes' })
      setSearchTerm('')
    }
  }, [isOpen])

  const renderMakesView = () => (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Søg mærker..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Popular Makes */}
      {filteredMakes.popular.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Populære mærker</h3>
          <div className="space-y-2">
            {filteredMakes.popular.map((make) => {
              const isSelected = selectedMakeIds.includes(make.id)
              const selection = selectedCars.find(s => s.makeId === make.id)
              const modelCount = selection?.models.length || 0
              
              return (
                <div
                  key={make.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleMakeToggle(make)}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <div className="flex-1">
                      <span className="font-medium">{make.name}</span>
                      {modelCount > 0 && (
                        <span className="ml-2 text-sm text-muted-foreground">
                          ({modelCount} {modelCount === 1 ? 'model' : 'modeller'})
                        </span>
                      )}
                    </div>
                  </div>
                  {isSelected && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMakeDrillDown(make)}
                      className="ml-2 p-2"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Other Makes */}
      {filteredMakes.other.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Andre mærker</h3>
          <div className="space-y-2">
            {filteredMakes.other.map((make) => {
              const isSelected = selectedMakeIds.includes(make.id)
              const selection = selectedCars.find(s => s.makeId === make.id)
              const modelCount = selection?.models.length || 0
              
              return (
                <div
                  key={make.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleMakeToggle(make)}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <div className="flex-1">
                      <span className="font-medium">{make.name}</span>
                      {modelCount > 0 && (
                        <span className="ml-2 text-sm text-muted-foreground">
                          ({modelCount} {modelCount === 1 ? 'model' : 'modeller'})
                        </span>
                      )}
                    </div>
                  </div>
                  {isSelected && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMakeDrillDown(make)}
                      className="ml-2 p-2"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* No results */}
      {searchTerm && filteredMakes.popular.length === 0 && filteredMakes.other.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Car className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Ingen mærker fundet for "{searchTerm}"</p>
        </div>
      )}
    </div>
  )

  const renderModelsView = () => {
    const selectedModels = getSelectedModelsForCurrentMake()
    
    return (
      <div className="space-y-6">
        {/* Header with back button */}
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToMakes}
            className="p-2"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h3 className="font-semibold">{viewState.selectedMakeName}</h3>
            <p className="text-sm text-muted-foreground">
              {selectedModels.length} {selectedModels.length === 1 ? 'model valgt' : 'modeller valgt'}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Søg modeller..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Models list */}
        <div className="space-y-2">
          {currentMakeModels.map((model) => {
            const isSelected = selectedModels.some(m => m.id === model.id)
            const canSelect = !maxSelections || totalSelectedModels < maxSelections || isSelected
            
            return (
              <div
                key={model.id}
                className={cn(
                  "flex items-center space-x-3 p-3 rounded-lg border transition-colors",
                  canSelect ? "hover:bg-muted/50" : "opacity-50 cursor-not-allowed"
                )}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => handleModelToggle(model)}
                  disabled={!canSelect}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <span className={cn(
                  "font-medium flex-1",
                  !canSelect && "text-muted-foreground"
                )}>
                  {model.name}
                </span>
              </div>
            )
          })}
        </div>

        {/* No models found */}
        {currentMakeModels.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Car className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>
              {searchTerm 
                ? `Ingen modeller fundet for "${searchTerm}"`
                : `Ingen modeller tilgængelige for ${viewState.selectedMakeName}`
              }
            </p>
          </div>
        )}
      </div>
    )
  }

  const renderSelectionSummary = () => {
    if (totalSelectedModels === 0) return null

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground">Valgte biler</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="text-destructive hover:text-destructive p-1 h-auto"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Ryd alle
          </Button>
        </div>
        
        <div className="space-y-3">
          {selectedCars.map((selection) => (
            <div key={selection.makeId} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{selection.makeName}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveSelection(selection.makeId)}
                  className="text-destructive hover:text-destructive p-1 h-auto"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
              {selection.models.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selection.models.map((model) => (
                    <Badge
                      key={model.id}
                      variant="secondary"
                      className="text-xs flex items-center gap-1"
                    >
                      {model.name}
                      <button
                        onClick={() => handleRemoveSelection(selection.makeId, model.id)}
                        className="hover:bg-destructive/20 rounded-full"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        
        <Separator />
      </div>
    )
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn("w-full justify-start text-left font-normal", className)}
        >
          <Car className="w-4 h-4 mr-2" />
          {totalSelectedModels > 0 
            ? `${totalSelectedModels} ${totalSelectedModels === 1 ? 'bil valgt' : 'biler valgt'}`
            : placeholder
          }
        </Button>
      </SheetTrigger>
      
      <SheetContent side="bottom" className="h-[90vh] flex flex-col">
        <SheetHeader className="text-left">
          <SheetTitle>
            {viewState.mode === 'makes' ? 'Vælg bilmærker' : `Modeller - ${viewState.selectedMakeName}`}
          </SheetTitle>
          <SheetDescription>
            {viewState.mode === 'makes' 
              ? 'Vælg de bilmærker du er interesseret i, og drill derefter ned i specifikke modeller'
              : 'Vælg de modeller du ønsker at se i søgeresultaterne'
            }
          </SheetDescription>
          {maxSelections && (
            <p className="text-sm text-muted-foreground">
              {totalSelectedModels}/{maxSelections} biler valgt
            </p>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-6">
            {renderSelectionSummary()}
            {viewState.mode === 'makes' ? renderMakesView() : renderModelsView()}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

export default CarSelector