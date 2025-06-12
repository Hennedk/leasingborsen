import React, { useState, useMemo } from 'react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X, Car } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CarMake, CarModel, CarSelection } from './CarSelector'

interface CarSelectorAccordionProps {
  makes: CarMake[]
  models: CarModel[]
  selectedCars: CarSelection[]
  onSelectionChange: (selections: CarSelection[]) => void
  className?: string
}

/**
 * Alternative Approach 1: Compact Accordion Multi-Select
 * 
 * Pros:
 * - Single view, no navigation required
 * - Compact design good for forms
 * - Progressive disclosure of models
 * 
 * Cons:
 * - Can become overwhelming with many makes
 * - Less mobile-optimized than modal approach
 * - Limited space for search/filters
 */
const CarSelectorAccordion: React.FC<CarSelectorAccordionProps> = ({
  makes,
  models,
  selectedCars,
  onSelectionChange,
  className
}) => {
  const [openItems, setOpenItems] = useState<string[]>([])

  const selectedMakeIds = useMemo(() => 
    selectedCars.map(selection => selection.makeId),
    [selectedCars]
  )

  const totalSelectedModels = useMemo(() => 
    selectedCars.reduce((total, selection) => total + selection.models.length, 0),
    [selectedCars]
  )

  const handleMakeToggle = (make: CarMake) => {
    const isSelected = selectedMakeIds.includes(make.id)
    
    if (isSelected) {
      onSelectionChange(selectedCars.filter(selection => selection.makeId !== make.id))
      setOpenItems(prev => prev.filter(id => id !== make.id))
    } else {
      const newSelection: CarSelection = {
        makeId: make.id,
        makeName: make.name,
        models: []
      }
      onSelectionChange([...selectedCars, newSelection])
      setOpenItems(prev => [...prev, make.id])
    }
  }

  const handleModelToggle = (model: CarModel) => {
    const selectionIndex = selectedCars.findIndex(s => s.makeId === model.makeId)
    if (selectionIndex === -1) return

    const currentSelection = selectedCars[selectionIndex]
    const modelIndex = currentSelection.models.findIndex(m => m.id === model.id)
    
    let updatedModels: CarModel[]
    if (modelIndex >= 0) {
      updatedModels = currentSelection.models.filter(m => m.id !== model.id)
    } else {
      updatedModels = [...currentSelection.models, model]
    }

    const updatedSelection: CarSelection = {
      ...currentSelection,
      models: updatedModels
    }

    const newSelections = [...selectedCars]
    newSelections[selectionIndex] = updatedSelection
    onSelectionChange(newSelections)
  }

  const getModelsForMake = (makeId: string) => 
    models.filter(model => model.makeId === makeId)

  const getSelectedModelsForMake = (makeId: string) => {
    const selection = selectedCars.find(s => s.makeId === makeId)
    return selection?.models || []
  }

  if (totalSelectedModels === 0) {
    return (
      <Button
        variant="outline"
        className={cn("w-full justify-start text-left font-normal text-muted-foreground", className)}
      >
        <Car className="w-4 h-4 mr-2" />
        Vælg biler
      </Button>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Selection Summary */}
      <div className="flex flex-wrap gap-1">
        {selectedCars.map((selection) => (
          selection.models.map((model) => (
            <Badge key={model.id} variant="secondary" className="text-xs">
              {selection.makeName} {model.name}
              <button
                onClick={() => handleModelToggle(model)}
                className="ml-1 hover:bg-destructive/20 rounded-full"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))
        ))}
      </div>

      {/* Makes Accordion */}
      <Accordion
        type="multiple"
        value={openItems}
        onValueChange={setOpenItems}
        className="border rounded-lg"
      >
        {makes.map((make) => {
          const isSelected = selectedMakeIds.includes(make.id)
          const makeModels = getModelsForMake(make.id)
          const selectedModels = getSelectedModelsForMake(make.id)
          
          return (
            <AccordionItem key={make.id} value={make.id} className="border-b-0">
              <AccordionTrigger className="hover:no-underline px-4">
                <div className="flex items-center space-x-3 flex-1">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleMakeToggle(make)}
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  />
                  <span className="font-medium">{make.name}</span>
                  {selectedModels.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {selectedModels.length}
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              
              {isSelected && (
                <AccordionContent className="px-4 pb-4">
                  <div className="grid grid-cols-1 gap-2">
                    {makeModels.map((model) => {
                      const isModelSelected = selectedModels.some(m => m.id === model.id)
                      
                      return (
                        <div key={model.id} className="flex items-center space-x-3">
                          <Checkbox
                            checked={isModelSelected}
                            onCheckedChange={() => handleModelToggle(model)}
                          />
                          <span className="text-sm">{model.name}</span>
                        </div>
                      )
                    })}
                  </div>
                </AccordionContent>
              )}
            </AccordionItem>
          )
        })}
      </Accordion>
    </div>
  )
}

export default CarSelectorAccordion