import React, { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { X, Search, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CarMake, CarModel, CarSelection } from './CarSelector'

interface CarSelectorTagsProps {
  makes: CarMake[]
  models: CarModel[]
  selectedCars: CarSelection[]
  onSelectionChange: (selections: CarSelection[]) => void
  className?: string
}

/**
 * Alternative Approach 2: Tag-Based Quick Select
 * 
 * Pros:
 * - Very fast selection for power users
 * - Excellent for known car names
 * - Compact and clean interface
 * - Great search experience
 * 
 * Cons:
 * - Requires users to know car names
 * - Less discoverable than hierarchical approach
 * - May be confusing for first-time users
 */
const CarSelectorTags: React.FC<CarSelectorTagsProps> = ({
  models,
  selectedCars,
  onSelectionChange,
  className
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)

  const allCombinations = useMemo(() => {
    return models.map(model => ({
      id: `${model.makeId}-${model.id}`,
      makeId: model.makeId,
      makeName: model.makeName,
      modelId: model.id,
      modelName: model.name,
      displayName: `${model.makeName} ${model.name}`,
      searchText: `${model.makeName} ${model.name}`.toLowerCase()
    }))
  }, [models])

  const selectedCombinations = useMemo(() => {
    const combinations: string[] = []
    selectedCars.forEach(selection => {
      selection.models.forEach(model => {
        combinations.push(`${selection.makeId}-${model.id}`)
      })
    })
    return combinations
  }, [selectedCars])

  const filteredCombinations = useMemo(() => {
    if (!searchTerm) return []
    
    const searchLower = searchTerm.toLowerCase()
    return allCombinations
      .filter(combo => combo.searchText.includes(searchLower))
      .filter(combo => !selectedCombinations.includes(combo.id))
      .slice(0, 10) // Limit results for performance
  }, [allCombinations, searchTerm, selectedCombinations])

  const handleAddCombination = (combination: typeof allCombinations[0]) => {
    const existingSelectionIndex = selectedCars.findIndex(
      selection => selection.makeId === combination.makeId
    )

    const model: CarModel = {
      id: combination.modelId,
      name: combination.modelName,
      makeId: combination.makeId,
      makeName: combination.makeName
    }

    if (existingSelectionIndex >= 0) {
      // Add to existing make selection
      const updatedSelection = {
        ...selectedCars[existingSelectionIndex],
        models: [...selectedCars[existingSelectionIndex].models, model]
      }
      const newSelections = [...selectedCars]
      newSelections[existingSelectionIndex] = updatedSelection
      onSelectionChange(newSelections)
    } else {
      // Create new make selection
      const newSelection: CarSelection = {
        makeId: combination.makeId,
        makeName: combination.makeName,
        models: [model]
      }
      onSelectionChange([...selectedCars, newSelection])
    }

    setSearchTerm('')
  }

  const handleRemoveCombination = (makeId: string, modelId: string) => {
    const updatedSelections = selectedCars.map(selection => {
      if (selection.makeId === makeId) {
        return {
          ...selection,
          models: selection.models.filter(m => m.id !== modelId)
        }
      }
      return selection
    }).filter(selection => selection.models.length > 0)

    onSelectionChange(updatedSelections)
  }

  const totalSelectedModels = selectedCombinations.length

  return (
    <div className={cn("space-y-3", className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Søg efter bil (f.eks. 'BMW X3', 'Audi A4')..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsExpanded(true)}
          onBlur={() => setTimeout(() => setIsExpanded(false), 200)}
          className="pl-10"
        />
      </div>

      {/* Search Results */}
      {isExpanded && searchTerm && filteredCombinations.length > 0 && (
        <div className="border rounded-lg bg-card shadow-lg">
          <ScrollArea className="max-h-48">
            <div className="p-2 space-y-1">
              {filteredCombinations.map((combination) => (
                <Button
                  key={combination.id}
                  variant="ghost"
                  className="w-full justify-between h-auto p-2"
                  onMouseDown={() => handleAddCombination(combination)}
                >
                  <span className="text-left">
                    <span className="font-medium">{combination.makeName}</span>
                    <span className="text-muted-foreground ml-1">{combination.modelName}</span>
                  </span>
                  <Plus className="w-4 h-4" />
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* No results message */}
      {isExpanded && searchTerm && filteredCombinations.length === 0 && (
        <div className="border rounded-lg bg-card p-4 text-center text-muted-foreground">
          <p className="text-sm">Ingen resultater for "{searchTerm}"</p>
          <p className="text-xs mt-1">Prøv at søge efter mærke og model</p>
        </div>
      )}

      {/* Selected Cars */}
      {totalSelectedModels > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {totalSelectedModels} {totalSelectedModels === 1 ? 'bil valgt' : 'biler valgt'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelectionChange([])}
              className="text-destructive hover:text-destructive h-auto p-1"
            >
              Ryd alle
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {selectedCars.map((selection) =>
              selection.models.map((model) => (
                <Badge
                  key={`${selection.makeId}-${model.id}`}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  <span className="font-medium">{selection.makeName}</span>
                  <span>{model.name}</span>
                  <button
                    onClick={() => handleRemoveCombination(selection.makeId, model.id)}
                    className="hover:bg-destructive/20 rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))
            )}
          </div>
        </div>
      )}

      {/* Help text */}
      {totalSelectedModels === 0 && !searchTerm && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">Start med at søge efter en bil</p>
          <p className="text-xs mt-1">F.eks. "BMW X3" eller "Audi A4"</p>
        </div>
      )}
    </div>
  )
}

export default CarSelectorTags