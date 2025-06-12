import React, { useState } from 'react'
import CarSelector, { type CarMake, type CarModel, type CarSelection } from './CarSelector'

// Example data
const EXAMPLE_MAKES: CarMake[] = [
  { id: '1', name: 'Audi', isPopular: true },
  { id: '2', name: 'BMW', isPopular: true },
  { id: '3', name: 'Mercedes-Benz', isPopular: true },
  { id: '4', name: 'Toyota', isPopular: true },
  { id: '5', name: 'Volkswagen', isPopular: true },
  { id: '6', name: 'Hyundai', isPopular: false },
  { id: '7', name: 'Kia', isPopular: false },
  { id: '8', name: 'Renault', isPopular: false },
  { id: '9', name: 'Skoda', isPopular: false },
  { id: '10', name: 'Cupra', isPopular: false },
]

const EXAMPLE_MODELS: CarModel[] = [
  // Audi models
  { id: '1', name: 'A3', makeId: '1', makeName: 'Audi' },
  { id: '2', name: 'A4', makeId: '1', makeName: 'Audi' },
  { id: '3', name: 'A6', makeId: '1', makeName: 'Audi' },
  { id: '4', name: 'Q3', makeId: '1', makeName: 'Audi' },
  { id: '5', name: 'Q5', makeId: '1', makeName: 'Audi' },
  
  // BMW models
  { id: '6', name: '1 Series', makeId: '2', makeName: 'BMW' },
  { id: '7', name: '3 Series', makeId: '2', makeName: 'BMW' },
  { id: '8', name: '5 Series', makeId: '2', makeName: 'BMW' },
  { id: '9', name: 'X1', makeId: '2', makeName: 'BMW' },
  { id: '10', name: 'X3', makeId: '2', makeName: 'BMW' },
  
  // Mercedes-Benz models
  { id: '11', name: 'A-Class', makeId: '3', makeName: 'Mercedes-Benz' },
  { id: '12', name: 'C-Class', makeId: '3', makeName: 'Mercedes-Benz' },
  { id: '13', name: 'E-Class', makeId: '3', makeName: 'Mercedes-Benz' },
  { id: '14', name: 'GLA', makeId: '3', makeName: 'Mercedes-Benz' },
  { id: '15', name: 'GLC', makeId: '3', makeName: 'Mercedes-Benz' },
  
  // Toyota models
  { id: '16', name: 'Corolla', makeId: '4', makeName: 'Toyota' },
  { id: '17', name: 'Camry', makeId: '4', makeName: 'Toyota' },
  { id: '18', name: 'RAV4', makeId: '4', makeName: 'Toyota' },
  { id: '19', name: 'Highlander', makeId: '4', makeName: 'Toyota' },
  { id: '20', name: 'Prius', makeId: '4', makeName: 'Toyota' },
  
  // Volkswagen models
  { id: '21', name: 'Golf', makeId: '5', makeName: 'Volkswagen' },
  { id: '22', name: 'Passat', makeId: '5', makeName: 'Volkswagen' },
  { id: '23', name: 'Tiguan', makeId: '5', makeName: 'Volkswagen' },
  { id: '24', name: 'Polo', makeId: '5', makeName: 'Volkswagen' },
  { id: '25', name: 'ID.4', makeId: '5', makeName: 'Volkswagen' },
]

const CarSelectorExample: React.FC = () => {
  const [selectedCars, setSelectedCars] = useState<CarSelection[]>([])

  const handleSelectionChange = (selections: CarSelection[]) => {
    setSelectedCars(selections)
    console.log('Car selections updated:', selections)
  }

  const totalModels = selectedCars.reduce((total, selection) => total + selection.models.length, 0)

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Car Selector Example</h1>
        <p className="text-muted-foreground">
          Select car makes and models using the hierarchical interface
        </p>
      </div>

      {/* Basic Usage */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Choose Cars</label>
        <CarSelector
          makes={EXAMPLE_MAKES}
          models={EXAMPLE_MODELS}
          selectedCars={selectedCars}
          onSelectionChange={handleSelectionChange}
          placeholder="Tap to select cars"
        />
      </div>

      {/* With Max Selections */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Choose Cars (Max 3)</label>
        <CarSelector
          makes={EXAMPLE_MAKES}
          models={EXAMPLE_MODELS}
          selectedCars={selectedCars}
          onSelectionChange={handleSelectionChange}
          maxSelections={3}
          placeholder="Tap to select up to 3 cars"
        />
      </div>

      {/* Selection Summary */}
      {selectedCars.length > 0 && (
        <div className="p-4 bg-muted rounded-lg space-y-3">
          <h3 className="font-semibold">Current Selection</h3>
          <div className="space-y-2">
            {selectedCars.map((selection) => (
              <div key={selection.makeId} className="text-sm">
                <span className="font-medium">{selection.makeName}:</span>{' '}
                {selection.models.length === 0 
                  ? 'No models selected'
                  : selection.models.map(model => model.name).join(', ')
                }
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Total: {totalModels} models from {selectedCars.length} makes
          </p>
        </div>
      )}

      {/* JSON Output for Development */}
      <details className="text-xs">
        <summary className="cursor-pointer font-medium">Raw Selection Data (Dev)</summary>
        <pre className="mt-2 p-2 bg-muted rounded overflow-x-auto">
          {JSON.stringify(selectedCars, null, 2)}
        </pre>
      </details>
    </div>
  )
}

export default CarSelectorExample